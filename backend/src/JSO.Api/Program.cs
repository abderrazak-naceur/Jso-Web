using Microsoft.AspNetCore.DataProtection;
using JSO.Api;
using JSO.Api.Security;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Localization;
using System.Globalization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using System.Net;
using System.Text;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddHttpClient("Resend", client =>
{
    client.Timeout = TimeSpan.FromSeconds(10);
});

var dataProtectionKeysPath = builder.Configuration["DataProtection:KeysPath"];
var dataProtection = builder.Services
    .AddDataProtection()
    .SetApplicationName("JSO.Api");

if (string.IsNullOrWhiteSpace(dataProtectionKeysPath))
{
    // Render's current free container has no persistent disk configured.
    // The application uses JWT authentication, so no persistent DataProtection
    // payload is required today. Make that lifecycle explicit instead of
    // silently generating keys that disappear on container replacement.
    dataProtection.UseEphemeralDataProtectionProvider();
    builder.Services.AddSingleton<IDataProtectionProvider>(_ => new EphemeralDataProtectionProvider());
}
else
{
    Directory.CreateDirectory(dataProtectionKeysPath);
    dataProtection.PersistKeysToFileSystem(new DirectoryInfo(dataProtectionKeysPath));
}
builder.Services.AddScoped<JwtTokenService>();
builder.Services.AddScoped<AuditService>();
builder.Services.AddScoped<StaffAuthorizationService>();
builder.Services.AddScoped<DatabaseInitializer>();
builder.Services.AddScoped<ContentTranslationService>();
// Shared resolver for payment provider return/cancel base URLs (shop, tickets,
// supporters' wall). Keeps the Host-header policy in one place.
builder.Services.AddScoped<JSO.Api.PaymentLinkBuilder>();

// Weather-enriched match reminders (idea G22). Open-Meteo is a free, keyless
// provider so no secret is introduced. The HttpClient uses a short timeout and
// the service falls back to weather=null on any failure, so this is safe even
// when the production network is closed.
builder.Services.Configure<WeatherOptions>(builder.Configuration.GetSection(WeatherOptions.SectionName));
builder.Services.AddHttpClient<WeatherService>(client =>
{
    client.BaseAddress = new Uri("https://api.open-meteo.com/");
    client.Timeout = TimeSpan.FromSeconds(4);
});

var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey) || jwtKey.Length < 32)
    throw new InvalidOperationException("Jwt:Key must contain at least 32 characters.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "JSO",
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "JSO.Admin",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.FromMinutes(1)
        };
        // Blocked fan accounts must lose access immediately, including requests
        // made with an already-issued JWT (not only future login attempts).
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = async context =>
            {
                var role = context.Principal?.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value
                    ?? context.Principal?.FindFirst("role")?.Value;
                if (string.IsNullOrWhiteSpace(role))
                {
                    context.Fail("Missing identity role.");
                    return;
                }

                var subject = context.Principal?.FindFirst("sub")?.Value
                    ?? context.Principal?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(subject, out var userId))
                {
                    context.Fail("Invalid identity.");
                    return;
                }

                await using var scope = context.HttpContext.RequestServices.CreateAsyncScope();
                var db = scope.ServiceProvider.GetRequiredService<JsoDbContext>();

                if (string.Equals(role, "Fan", StringComparison.OrdinalIgnoreCase))
                {
                    var isActiveFan = await db.FanUsers.AsNoTracking()
                        .AnyAsync(x => x.Id == userId && x.IsActive);
                    if (!isActiveFan) context.Fail("Fan account is inactive.");
                    return;
                }

                // Admin tokens are self-contained JWTs. Re-check the current database
                // account on every request so disabling an account or changing its role
                // revokes its already-issued tokens immediately instead of waiting up to
                // eight hours for token expiry.
                var isActiveAdminWithSameRole = await db.AdminUsers.AsNoTracking()
                    .AnyAsync(x => x.Id == userId && x.IsActive && x.Role == role);
                if (!isActiveAdminWithSameRole) context.Fail("Admin account is inactive or its role has changed.");
            }
        };
    });
builder.Services.AddAuthorization(options => options.AddAdminPermissionPolicies());
builder.Services.AddProblemDetails();
builder.Services.Configure<RequestLocalizationOptions>(options =>
{
    var supportedCultures = new[]
    {
        new CultureInfo("fr"),
        new CultureInfo("en"),
        new CultureInfo("it"),
        new CultureInfo("ar"),
    };

    options.DefaultRequestCulture = new RequestCulture("fr");
    options.SupportedCultures = supportedCultures;
    options.SupportedUICultures = supportedCultures;
    options.ApplyCurrentCultureToResponseHeaders = true;
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddHealthChecks()
    .AddDbContextCheck<JsoDbContext>();

var origins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? [];

if (!builder.Environment.IsDevelopment() && origins.Length == 0)
    throw new InvalidOperationException("Cors:AllowedOrigins must contain the public frontend origin in Production.");

builder.Services.AddCors(options =>
{
    // Always allow the canonical Render frontend origin. The configured list
    // remains supported for custom domains and preview environments; this
    // avoids browser CORS failures when the Render env var is missing the
    // production frontend URL or contains an outdated value.
    var allowedOrigins = origins
        .Append("https://jso-web.onrender.com")
        .Append("https://jsoudhref.com")
        .Append("https://www.jsoudhref.com")
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToArray();

    options.AddPolicy("Frontend", policy =>
    {
        policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod();
    });
});

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownProxies.Add(IPAddress.Loopback);
});

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("public-api", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 120,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
            AutoReplenishment = true
        }));
    options.AddPolicy("auth-login", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 5,
            Window = TimeSpan.FromMinutes(5),
            QueueLimit = 0,
            AutoReplenishment = true
        }));
    // Anti-abuse limiter for the staff ticket scanner (validate/check-in).
    // Partitioned per staff identity when available (falling back to IP) so a
    // stolen/leaked token cannot be brute-forced against the lookup endpoint,
    // while still allowing a steady stream of legitimate gate scans.
    options.AddPolicy("ticket-scan", context => RateLimitPartition.GetFixedWindowLimiter(
        context.User?.FindFirst("sub")?.Value
            ?? context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 60,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
            AutoReplenishment = true
        }));
    // Anti-spam limiter for authenticated fan community writes (comments,
    // reactions, reports). Partitioned per fan identity when available so a
    // single account cannot flood the moderation queue, falling back to IP.
    options.AddPolicy("community-write", context => RateLimitPartition.GetFixedWindowLimiter(
        context.User?.FindFirst("sub")?.Value
            ?? context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 20,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
            AutoReplenishment = true
        }));
});

var app = builder.Build();

await using (var startupScope = app.Services.CreateAsyncScope())
{
    await startupScope.ServiceProvider.GetRequiredService<DatabaseInitializer>().InitializeAsync();
}

app.UseForwardedHeaders();

// Swagger is enabled in production as well as development so the deployed API
// can be inspected and tested from the browser. Protected endpoints still enforce
// their existing JWT/role policies; Swagger does not bypass authorization.
if (builder.Configuration.GetValue("Swagger:Enabled", true))
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "JSO API v1");
        options.RoutePrefix = "swagger";
        options.DocumentTitle = "JSO API - Swagger";
    });
}

// Render terminates TLS at the edge. The app listens on the internal HTTP port,
// so HTTPS redirection here would only create an unnecessary warning.

var uploadsPath = Path.Combine(app.Environment.ContentRootPath, "uploads");
Directory.CreateDirectory(uploadsPath);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadsPath),
    RequestPath = "/uploads",
    OnPrepareResponse = context =>
    {
        context.Context.Response.Headers.CacheControl = "public,max-age=86400";
        context.Context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    }
});

app.UseRequestLocalization();
app.UseExceptionHandler();
// Aggregate-only API usage metrics (idea E16). Placed right after the
// exception handler so it observes the final status code of every request
// (including auth failures) while never storing any personal data.
app.UseMiddleware<ApiUsageMiddleware>();
app.UseRouting();
app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

app.MapControllers().RequireRateLimiting("public-api");
app.MapHealthChecks("/health");

app.Run();
