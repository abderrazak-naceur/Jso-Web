using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Birthday & membership-anniversary touchpoints (idea A3).
//
// This endpoint lists the fans whose birthday or iscrizione (sign-up)
// anniversary falls on a given day, so the community team can reach out.
//
// Privacy/GDPR by design:
//  - Only fans who explicitly opted in (AnniversaryOptIn == true) are ever
//    considered. Birth dates of everyone else are never read here.
//  - Data minimisation: the response exposes only the minimum needed
//    (DisplayName, recurrence kind, and number of years), never the raw
//    birth date or e-mail.
//  - The route is admin-only (ClubAdmin / CommunityManager).
//
// This iteration builds the touchpoints only. Sending a real e-mail/message is
// intentionally OUT OF SCOPE.
// TODO(A3): actually deliver the greetings (transactional e-mail / push) via a
// certified provider once the messaging channel is decided. Until then this is
// a read-only planning view; no message is sent from here.
[ApiController]
[Authorize(Roles = "ClubAdmin,CommunityManager")]
[Route("api/admin/anniversaries")]
public sealed class AdminAnniversariesController(JsoDbContext db) : ControllerBase
{
    // GET /api/admin/anniversaries/today            -> touchpoints for UTC today
    // GET /api/admin/anniversaries/today?date=YYYY-MM-DD -> touchpoints for a chosen day
    [HttpGet("today")]
    public async Task<IActionResult> GetToday([FromQuery] DateOnly? date, CancellationToken ct)
    {
        var day = date ?? DateOnly.FromDateTime(DateTimeOffset.UtcNow.UtcDateTime);

        // Only opt-in fans are read (privacy + minimisation). We pull the small
        // set of columns we need and finish the recurrence matching in memory,
        // which keeps the query provider-agnostic.
        var candidates = await db.FanUsers.AsNoTracking()
            .Where(f => f.IsActive && f.AnniversaryOptIn)
            .Select(f => new { f.Id, f.DisplayName, f.BirthDate, f.CreatedAt })
            .ToListAsync(ct);

        var touchpoints = new List<AnniversaryTouchpoint>();

        foreach (var fan in candidates)
        {
            // Birthday: same month/day. Years lived is optional info (only when
            // we can compute a meaningful, non-negative age).
            if (fan.BirthDate is DateOnly birth && IsSameDayOfYear(birth, day))
            {
                var years = day.Year - birth.Year;
                touchpoints.Add(new AnniversaryTouchpoint(
                    fan.Id, fan.DisplayName, "Birthday", years >= 0 ? years : null));
            }

            // Membership anniversary: same month/day as the sign-up date, and at
            // least one full year later (skip the day they joined).
            var member = DateOnly.FromDateTime(fan.CreatedAt.UtcDateTime);
            if (IsSameDayOfYear(member, day))
            {
                var years = day.Year - member.Year;
                if (years >= 1)
                    touchpoints.Add(new AnniversaryTouchpoint(
                        fan.Id, fan.DisplayName, "Membership", years));
            }
        }

        var ordered = touchpoints
            .OrderBy(t => t.Kind)
            .ThenBy(t => t.DisplayName, StringComparer.OrdinalIgnoreCase)
            .ToList();

        return Ok(new
        {
            date = day,
            counts = new
            {
                total = ordered.Count,
                birthdays = ordered.Count(t => t.Kind == "Birthday"),
                memberships = ordered.Count(t => t.Kind == "Membership")
            },
            // Reminder for the frontend/consumers that no message is dispatched.
            emailDelivery = "out-of-scope",
            touchpoints = ordered
        });
    }

    // Matches month/day while treating 29 February as 28 February on non-leap
    // years, so a leap-day recurrence is still surfaced once a year.
    private static bool IsSameDayOfYear(DateOnly anchor, DateOnly day)
    {
        if (anchor.Month == day.Month && anchor.Day == day.Day) return true;
        if (anchor is { Month: 2, Day: 29 } && day is { Month: 2, Day: 28 }
            && !DateTime.IsLeapYear(day.Year))
            return true;
        return false;
    }
}

// Minimal touchpoint projection (data minimisation): identity + recurrence
// kind ("Birthday" / "Membership") + number of years. No birth date, no e-mail.
public sealed record AnniversaryTouchpoint(Guid FanUserId, string DisplayName, string Kind, int? Years);
