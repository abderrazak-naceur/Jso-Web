using JSO.Infrastructure;

namespace JSO.Api;

public static class RequestLanguage
{
    public static string Get(HttpRequest request)
    {
        var header = request.Headers.AcceptLanguage.ToString();
        var candidate = header.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(x => x.Split(';', 2)[0])
            .FirstOrDefault();

        return ContentTranslationService.NormalizeLanguage(candidate);
    }
}
