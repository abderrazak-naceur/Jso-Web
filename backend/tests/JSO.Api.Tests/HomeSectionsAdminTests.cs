using System.Text.Json;
using JSO.Api.Controllers;
using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Tests;

public sealed class HomeSectionsAdminTests
{
    [Fact]
    public async Task Visibility_includes_donation_and_can_hide_it()
    {
        await using var db = Memory();
        var controller = new AdminHomeVisibilityController(db, new AuditService(db))
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
        };

        var before = JsonSerializer.Serialize(Assert.IsType<OkObjectResult>(await controller.Get(default)).Value);
        Assert.Contains("\"id\":\"donation\"", before);
        Assert.Contains("\"label\":\"Soutenir\"", before);

        Assert.IsType<OkObjectResult>(await controller.Update(new HomeVisibilityRequest(["donation"]), default));

        var stored = await db.SiteContents.SingleAsync(x => x.Key == AdminHomeVisibilityController.ContentKey);
        Assert.Equal("donation", stored.Value);
        var after = JsonSerializer.Serialize(Assert.IsType<OkObjectResult>(await controller.Get(default)).Value);
        Assert.Contains("{\"id\":\"donation\",\"label\":\"Soutenir\",\"enabled\":false}", after);
    }

    [Fact]
    public async Task Every_renderable_type_can_be_created_and_reordered()
    {
        await using var db = Memory();
        var controller = new AdminHomeSectionsController(db, new AuditService(db))
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
        };
        string[] types =
        [
            "Hero", "SellingBand", "Highlights", "AppDownload", "Matches", "News",
            "Team", "Club", "Shop", "Donation", "Memberships", "Media", "Events",
            "Community", "Archive", "Mobile", "Sponsors", "Infos"
        ];

        foreach (var (type, index) in types.Select((type, index) => (type, index)))
        {
            var result = await controller.Create(new HomeSectionRequest(type, type, null, index, true), default);
            Assert.IsType<CreatedResult>(result);
        }

        var ids = await db.HomeSections.OrderByDescending(x => x.DisplayOrder).Select(x => x.Id).ToListAsync();
        Assert.IsType<NoContentResult>(await controller.Reorder(new ReorderRequest(ids), default));
        var reordered = await db.HomeSections.OrderBy(x => x.DisplayOrder).Select(x => x.Type).ToListAsync();
        Assert.Equal(types.Reverse(), reordered);
        Assert.IsType<BadRequestObjectResult>(await controller.Create(
            new HomeSectionRequest("Unknown", null, null), default));
    }

    private static JsoDbContext Memory() => new(new DbContextOptionsBuilder<JsoDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
}
