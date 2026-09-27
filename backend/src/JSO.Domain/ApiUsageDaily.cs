namespace JSO.Domain;

// Aggregated daily API usage counter (idea E16).
// Privacy by design: this row stores ONLY aggregate counters. It never keeps
// any personal data: no client IP, no user id, no query string and no raw path
// with entity ids. The middleware that feeds it normalises every request to a
// coarse route group (e.g. "api/admin", "api/matches") and a status class
// ("2xx"/"3xx"/"4xx"/"5xx") before incrementing the counter, so a single row is
// a pure count for a given day + route group + status class.
public sealed class ApiUsageDaily
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // UTC calendar day the requests were observed (date only, time is 00:00:00).
    public DateOnly Date { get; set; }

    // Coarse route group, e.g. "api/admin", "api/matches", "health", "other".
    // Never a full path and never contains raw ids.
    public string RouteGroup { get; set; } = null!;

    // Status class bucket: "2xx", "3xx", "4xx" or "5xx".
    public string StatusClass { get; set; } = null!;

    // Number of requests observed for this (Date, RouteGroup, StatusClass) key.
    public long Count { get; set; }
}
