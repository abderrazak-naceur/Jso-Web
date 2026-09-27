using System.Text.Json;
using Microsoft.Extensions.Options;

namespace JSO.Api;

// Weather forecast lookup for match reminders (idea G22 - "Promemoria partita con meteo").
//
// The service queries the public Open-Meteo forecast API. Open-Meteo is a
// free, keyless provider (no API key, no secret, no account) which keeps this
// feature at zero recurring cost and avoids introducing any credential into
// the codebase or configuration.
//
// Resilience by design: this is an OPTIONAL enrichment. Any failure - network
// closed (as it may well be on the production Oracle VM), timeout, non-2xx
// response, malformed payload, kickoff outside the forecast horizon, or the
// feature being disabled - resolves to a null forecast. The method NEVER
// throws and NEVER blocks the caller; a match reminder is always returned,
// just without the weather block.
//
// Approximation note: the domain model has no coordinates for a match Venue
// and we deliberately avoid any paid geocoding. The forecast is therefore
// resolved against the club's default location (Oudhref, Tunisia by default),
// configurable via the "Weather" section of appsettings. This is an
// approximation and is surfaced to consumers via the returned location label.
public sealed class WeatherService(HttpClient httpClient, IOptions<WeatherOptions> options, ILogger<WeatherService> logger)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    // Returns a synthetic forecast for the hour closest to kickoff, or null
    // when the weather is unavailable for any reason. Never throws.
    public async Task<WeatherForecast?> TryGetForecastAsync(DateTimeOffset kickoffAt, CancellationToken ct)
    {
        var opts = options.Value;
        if (!opts.Enabled)
            return null;

        var kickoffUtc = kickoffAt.ToUniversalTime();
        var nowUtc = DateTimeOffset.UtcNow;

        // Open-Meteo only serves a short forecast horizon. If the kickoff is in
        // the past or beyond the horizon there is nothing meaningful to fetch.
        if (kickoffUtc < nowUtc || kickoffUtc > nowUtc.AddDays(opts.ForecastHorizonDays))
            return null;

        try
        {
            var date = kickoffUtc.ToString("yyyy-MM-dd");
            var url =
                $"v1/forecast?latitude={opts.DefaultLatitude.ToString(System.Globalization.CultureInfo.InvariantCulture)}" +
                $"&longitude={opts.DefaultLongitude.ToString(System.Globalization.CultureInfo.InvariantCulture)}" +
                "&hourly=temperature_2m,precipitation_probability,weather_code" +
                "&timezone=UTC" +
                $"&start_date={date}&end_date={date}";

            using var response = await httpClient.GetAsync(url, ct);
            if (!response.IsSuccessStatusCode)
            {
                logger.LogDebug("Open-Meteo returned {StatusCode} for kickoff {Kickoff}", (int)response.StatusCode, kickoffUtc);
                return null;
            }

            await using var stream = await response.Content.ReadAsStreamAsync(ct);
            var payload = await JsonSerializer.DeserializeAsync<OpenMeteoResponse>(stream, JsonOptions, ct);

            var hourly = payload?.Hourly;
            if (hourly?.Time is null || hourly.Time.Length == 0)
                return null;

            // Pick the hourly slot closest to kickoff.
            var index = ClosestHourIndex(hourly.Time, kickoffUtc);
            if (index < 0)
                return null;

            var temperature = ValueAt(hourly.Temperature2m, index);
            var precipitation = ValueAt(hourly.PrecipitationProbability, index);
            var code = ValueAt(hourly.WeatherCode, index);
            if (temperature is null && precipitation is null && code is null)
                return null;

            var codeInt = code is null ? (int?)null : (int)Math.Round(code.Value);
            return new WeatherForecast(
                TemperatureCelsius: temperature is null ? null : Math.Round(temperature.Value, 1),
                PrecipitationProbabilityPercent: precipitation is null ? null : (int)Math.Round(precipitation.Value),
                WeatherCode: codeInt,
                Condition: DescribeWeatherCode(codeInt),
                LocationLabel: opts.DefaultLocationLabel,
                IsApproximateLocation: true,
                Provider: "Open-Meteo");
        }
        catch (Exception ex)
        {
            // Total fallback: any exception (timeout, DNS failure, cancellation
            // due to a closed network, malformed JSON, ...) yields no weather.
            logger.LogDebug(ex, "Weather lookup failed for kickoff {Kickoff}; returning null forecast", kickoffUtc);
            return null;
        }
    }

    // Finds the index of the hourly timestamp closest to the kickoff. Returns
    // -1 when timestamps cannot be parsed.
    private static int ClosestHourIndex(string[] times, DateTimeOffset kickoffUtc)
    {
        var best = -1;
        var bestDelta = TimeSpan.MaxValue;
        for (var i = 0; i < times.Length; i++)
        {
            // Open-Meteo returns naive local times; with timezone=UTC they are UTC.
            if (!DateTime.TryParse(times[i], System.Globalization.CultureInfo.InvariantCulture,
                    System.Globalization.DateTimeStyles.AssumeUniversal | System.Globalization.DateTimeStyles.AdjustToUniversal,
                    out var parsed))
                continue;

            var delta = (new DateTimeOffset(parsed, TimeSpan.Zero) - kickoffUtc).Duration();
            if (delta < bestDelta)
            {
                bestDelta = delta;
                best = i;
            }
        }
        return best;
    }

    private static double? ValueAt(double?[]? array, int index) =>
        array is not null && index >= 0 && index < array.Length ? array[index] : null;

    // Maps WMO weather interpretation codes to a short human label.
    // See https://open-meteo.com/en/docs (WMO Weather interpretation codes).
    internal static string? DescribeWeatherCode(int? code) => code switch
    {
        null => null,
        0 => "Clear sky",
        1 => "Mainly clear",
        2 => "Partly cloudy",
        3 => "Overcast",
        45 or 48 => "Fog",
        51 or 53 or 55 => "Drizzle",
        56 or 57 => "Freezing drizzle",
        61 or 63 or 65 => "Rain",
        66 or 67 => "Freezing rain",
        71 or 73 or 75 => "Snowfall",
        77 => "Snow grains",
        80 or 81 or 82 => "Rain showers",
        85 or 86 => "Snow showers",
        95 => "Thunderstorm",
        96 or 99 => "Thunderstorm with hail",
        _ => "Unknown"
    };

    // Minimal DTO mapping only the fields we consume from the Open-Meteo payload.
    private sealed class OpenMeteoResponse
    {
        public OpenMeteoHourly? Hourly { get; set; }
    }

    private sealed class OpenMeteoHourly
    {
        public string[]? Time { get; set; }

        [System.Text.Json.Serialization.JsonPropertyName("temperature_2m")]
        public double?[]? Temperature2m { get; set; }

        [System.Text.Json.Serialization.JsonPropertyName("precipitation_probability")]
        public double?[]? PrecipitationProbability { get; set; }

        [System.Text.Json.Serialization.JsonPropertyName("weather_code")]
        public double?[]? WeatherCode { get; set; }
    }
}

// Configuration for the weather feature. All values have safe defaults so the
// feature works out of the box without any appsettings entry, and it carries
// no secret (Open-Meteo is keyless).
public sealed class WeatherOptions
{
    public const string SectionName = "Weather";

    // Master switch; when false the reminder endpoint always returns weather=null.
    public bool Enabled { get; set; } = true;

    // Default club location (Oudhref, Tunisia). Used as an approximation
    // because matches have no stored coordinates. No paid geocoding is used.
    public double DefaultLatitude { get; set; } = 33.79;
    public double DefaultLongitude { get; set; } = 10.10;
    public string DefaultLocationLabel { get; set; } = "Oudhref, Tunisia";

    // Open-Meteo public forecast horizon in days.
    public int ForecastHorizonDays { get; set; } = 14;
}

// Synthetic forecast returned to consumers. All fields are nullable so partial
// provider data still produces a useful block.
public sealed record WeatherForecast(
    double? TemperatureCelsius,
    int? PrecipitationProbabilityPercent,
    int? WeatherCode,
    string? Condition,
    string LocationLabel,
    bool IsApproximateLocation,
    string Provider);
