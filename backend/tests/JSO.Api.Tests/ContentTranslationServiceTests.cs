using Xunit;
using JSO.Infrastructure;

namespace JSO.Api.Tests;

public sealed class ContentTranslationServiceTests
{
    [Theory]
    [InlineData("fr-FR", "fr")]
    [InlineData("en-US", "en")]
    [InlineData("it-IT", "it")]
    [InlineData("ar-TN", "ar")]
    [InlineData("AR", "ar")]
    [InlineData("de-DE", "fr")]
    [InlineData("", "fr")]
    public void Normalizes_supported_language_codes(string input, string expected)
    {
        Assert.Equal(expected, ContentTranslationService.NormalizeLanguage(input));
    }

    [Fact]
    public void Builds_stable_translation_key()
    {
        var id = Guid.Parse("11111111-1111-1111-1111-111111111111");

        var key = ContentTranslationService.Key("Article", id, "en-US", "Title");

        Assert.Equal("i18n:Article:11111111-1111-1111-1111-111111111111:en:title", key);
    }

    [Fact]
    public void Resolves_requested_language_then_french_then_source()
    {
        var id = Guid.NewGuid();
        var map = new Dictionary<string, string>
        {
            [ContentTranslationService.Key("Article", id, "fr", "title")] = "Titre FR",
            [ContentTranslationService.Key("Article", id, "en", "title")] = "English title",
        };

        Assert.Equal(
            "English title",
            ContentTranslationService.ResolveFromMap(map, "Article", id, "title", "Source", "en"));

        Assert.Equal(
            "Titre FR",
            ContentTranslationService.ResolveFromMap(map, "Article", id, "title", "Source", "it"));

        Assert.Equal(
            "Source",
            ContentTranslationService.ResolveFromMap(new Dictionary<string, string>(), "Article", id, "title", "Source", "ar"));
    }
}
