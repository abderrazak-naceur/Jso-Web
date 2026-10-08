using JSO.Api.Controllers;

namespace JSO.Api.Tests;

public sealed class SharePreviewTests
{
    [Fact]
    public void Social_preview_escapes_editor_text_and_redirects_to_canonical_url()
    {
        var preview = new SharePreview("<script>alert(1)</script>", "A \"quote\" & more", null, "/actualites/example");
        var html = SharePreviewController.RenderHtml(preview,
            "https://jso.example/actualites/example", "https://jso.example/crest.png");

        Assert.Contains("&lt;script&gt;", html);
        Assert.DoesNotContain("<script>alert(1)</script>", html);
        Assert.Contains("&quot;quote&quot; &amp; more", html);
        Assert.Contains("window.location.replace(\"https://jso.example/actualites/example\")", html);
    }
}
