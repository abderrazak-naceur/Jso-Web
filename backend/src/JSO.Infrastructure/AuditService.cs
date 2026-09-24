using System.Text.Json;
using JSO.Domain;

namespace JSO.Infrastructure;

public sealed class AuditService(JsoDbContext db)
{
    public async Task LogAsync(string action, string entityType, string? entityId, string? userId, string? userEmail, string? ipAddress, object? details = null, CancellationToken ct = default)
    {
        db.AuditLogs.Add(new AuditLog
        {
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            UserId = userId,
            UserEmail = userEmail,
            IpAddress = ipAddress,
            Details = details is null ? null : JsonSerializer.Serialize(details)
        });
        await db.SaveChangesAsync(ct);
    }
}
