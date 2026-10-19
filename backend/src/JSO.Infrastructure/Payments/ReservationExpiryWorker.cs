using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace JSO.Infrastructure.Payments;

/// <summary>Releases checkout holds promptly even when no new checkout is created.</summary>
public sealed class ReservationExpiryWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<ReservationExpiryWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var reservations = scope.ServiceProvider.GetRequiredService<InventoryReservationService>();
                var count = await reservations.ReleaseExpiredAsync(stoppingToken);
                if (count > 0) logger.LogInformation("Released {Count} expired shop/ticket reservations.", count);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to release expired inventory reservations.");
            }
        }
    }
}
