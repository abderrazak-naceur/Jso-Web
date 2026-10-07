using System.Security.Claims;
using System.Text.Json;
using JSO.Api.Security;
using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/staff/donations/cash")]
public sealed class StaffCashDonationsController(
    JsoDbContext db,
    AuditService audit) : ControllerBase
{
    [HttpGet("capabilities")]
    public async Task<IActionResult> Capabilities(CancellationToken ct)
    {
        var context = await GetStaffContext(ct);
        if (context is null) return Forbid();

        return Ok(new
        {
            canCollect = true,
            pointTypes = context.PointTypes,
            defaultPointType = context.PointTypes.Contains("Shop", StringComparer.OrdinalIgnoreCase) ? "Shop" : "Seller"
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateCashDonationRequest request, CancellationToken ct)
    {
        var context = await GetStaffContext(ct);
        if (context is null) return Forbid();

        var pointType = NormalizePointType(request.PointType);
        if (pointType is null)
            return BadRequest(new { message = "PointType must be Seller or Shop." });

        if (!context.PointTypes.Contains(pointType, StringComparer.OrdinalIgnoreCase))
            return Forbid();

        if (request.Amount < 1m || request.Amount > 1_000_000m)
            return BadRequest(new { message = "Le montant doit être compris entre 1 et 1 000 000 TND." });

        var donorName = string.IsNullOrWhiteSpace(request.DonorName)
            ? "Donateur anonyme"
            : request.DonorName.Trim();
        var note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();

        if (donorName.Length > 100) return BadRequest(new { message = "Le nom doit contenir au maximum 100 caractères." });
        if (request.Phone?.Trim().Length > 32) return BadRequest(new { message = "Le téléphone doit contenir au maximum 32 caractères." });
        if (note?.Length > 280) return BadRequest(new { message = "La note doit contenir au maximum 280 caractères." });

        var receiptNumber = $"JSO-CASH-{DateTimeOffset.UtcNow:yyyyMMdd}-{Random.Shared.Next(100000, 999999)}";

        var donation = new SupporterBrick
        {
            DisplayName = donorName,
            Message = note,
            Amount = decimal.Round(request.Amount, 2),
            Status = "Donation",
            PaymentStatus = "Paid",
            PaidAt = DateTimeOffset.UtcNow,
            PaymentProvider = "Cash",
            Country = "TN",
            ProviderRef = receiptNumber,
            ChargedAmount = decimal.Round(request.Amount, 2),
            ChargedCurrency = "TND",
            CashPointType = pointType,
            CashPointName = string.IsNullOrWhiteSpace(request.PointName) ? null : request.PointName.Trim(),
            CashDonorPhone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim()
        };

        db.SupporterBricks.Add(donation);
        await db.SaveChangesAsync(ct);

        await audit.LogAsync(
            "CASH_DONATION_RECEIPT_ISSUED",
            "SupporterBrick",
            donation.Id.ToString(),
            context.AdminId.ToString(),
            context.Email,
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            new
            {
                receiptNumber,
                amount = donation.Amount,
                donorName,
                phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim(),
                pointType,
                pointName = string.IsNullOrWhiteSpace(request.PointName) ? null : request.PointName.Trim(),
                collectorRole = context.Roles,
                campaign = "jso-support-2026"
            },
            ct);

        return Ok(BuildReceipt(donation, donorName, pointType, request.PointName, request.Phone));
    }

    private async Task<StaffContext?> GetStaffContext(CancellationToken ct)
    {
        var adminId = CurrentAdminId();
        if (adminId is null) return null;

        var user = await db.AdminUsers.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == adminId.Value && x.IsActive, ct);
        if (user is null) return null;

        var assignments = await db.StaffAssignments.AsNoTracking()
            .Where(x => x.AdminUserId == adminId.Value && x.IsActive)
            .ToListAsync(ct);

        var now = DateTimeOffset.UtcNow;
        var roles = assignments
            .Where(x => (!x.ValidFrom.HasValue || x.ValidFrom.Value <= now) &&
                        (!x.ValidTo.HasValue || x.ValidTo.Value >= now) &&
                        AdminPermissionCatalog.HasPermission(x.Role, AdminPermissions.DonationsCash))
            .Select(x => x.Role)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (roles.Length == 0) return null;

        var canBoth = roles.Any(x => x is "SuperAdmin" or "ClubAdmin" or "TicketSupervisor");
        var pointTypes = canBoth
            ? new[] { "Seller", "Shop" }
            : roles.Contains("ShopManager", StringComparer.OrdinalIgnoreCase)
                ? new[] { "Shop" }
                : new[] { "Seller" };

        return new StaffContext(adminId.Value, user.Email, roles, pointTypes);
    }

    private Guid? CurrentAdminId()
    {
        var value = User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(value, out var id) ? id : null;
    }

    private static string? NormalizePointType(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var normalized = value.Trim();
        return normalized.Equals("Seller", StringComparison.OrdinalIgnoreCase) ? "Seller"
            : normalized.Equals("Shop", StringComparison.OrdinalIgnoreCase) ? "Shop"
            : null;
    }

    private static object BuildReceipt(
        SupporterBrick donation,
        string donorName,
        string pointType,
        string? pointName,
        string? phone) => new
    {
        id = donation.Id,
        receiptNumber = donation.ProviderRef,
        donorName,
        phone = string.IsNullOrWhiteSpace(phone) ? null : phone.Trim(),
        amount = donation.Amount,
        currency = "TND",
        paidAt = donation.PaidAt,
        pointType,
        pointName = string.IsNullOrWhiteSpace(pointName) ? null : pointName.Trim(),
        receiptUrl = $"/api/donations/{donation.Id}/receipt"
    };

    private sealed record StaffContext(Guid AdminId, string? Email, string[] Roles, string[] PointTypes);
}

public sealed record CreateCashDonationRequest(
    string? DonorName,
    decimal Amount,
    string? Phone,
    string PointType,
    string? PointName,
    string? Note);
