using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace JSO.Api.Storage;

/// <summary>
/// Stores uploaded images as files in this repository through the GitHub Contents API.
/// Requires GitHubMedia:Token (a fine-grained PAT with Contents: write access).
/// </summary>
public sealed class GitHubRepositoryMediaStorage(IConfiguration configuration, IHttpClientFactory clients)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly string _repository = configuration["GitHubMedia:Repository"] ?? "abderrazak-naceur/Jso-Web";
    private readonly string _branch = configuration["GitHubMedia:Branch"] ?? "main";
    private readonly string _token = configuration["GitHubMedia:Token"] ?? "";
    private readonly string _directory = (configuration["GitHubMedia:Directory"] ?? "frontend/public/uploads")
        .Trim().Trim('/');

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_token);

    public async Task<string> SaveAsync(string fileName, string contentType, Stream content, CancellationToken ct)
    {
        if (!IsConfigured)
            throw new InvalidOperationException("GitHub image storage is not configured. Set GitHubMedia__Token in the API environment.");

        var safeName = Path.GetFileName(fileName);
        if (string.IsNullOrWhiteSpace(safeName) || safeName is "." or "..")
            throw new InvalidOperationException("Invalid image file name.");

        using var memory = new MemoryStream();
        await content.CopyToAsync(memory, ct);
        var bytes = memory.ToArray();
        var path = $"{_directory}/{DateTime.UtcNow:yyyy/MM}/{safeName}";
        var apiUrl = $"https://api.github.com/repos/{_repository}/contents/{string.Join("/", path.Split('/').Select(Uri.EscapeDataString))}";
        var client = clients.CreateClient(nameof(GitHubRepositoryMediaStorage));
        using var request = new HttpRequestMessage(HttpMethod.Put, apiUrl);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _token);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));
        request.Headers.UserAgent.ParseAdd("JSO-Media-Storage/1.0");
        request.Headers.Add("X-GitHub-Api-Version", "2022-11-28");
        request.Content = new StringContent(JsonSerializer.Serialize(new
        {
            message = $"Add uploaded JSO media: {safeName}",
            content = Convert.ToBase64String(bytes),
            branch = _branch
        }, JsonOptions), Encoding.UTF8, "application/json");

        using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
        if (!response.IsSuccessStatusCode)
        {
            var detail = await response.Content.ReadAsStringAsync(ct);
            throw new HttpRequestException($"GitHub image storage failed ({(int)response.StatusCode}): {SafeDetail(detail)}", null, response.StatusCode);
        }

        // Keep repository private/public choice separate from image delivery. The
        // API proxy below streams assets using the server-side token.
        return "/api/media/files/" + Uri.EscapeDataString(Path.GetFileNameWithoutExtension(safeName)) + Path.GetExtension(safeName).ToLowerInvariant() + "?path=" + Uri.EscapeDataString(path.Split('/').Skip(_directory.Split('/').Length).Aggregate((a, b) => a + "/" + b));
    }

    public async Task<(Stream Content, string ContentType, string? ETag)> OpenReadAsync(string relativePath, CancellationToken ct)
    {
        if (!IsConfigured)
            throw new InvalidOperationException("GitHub image storage is not configured.");
        var pieces = relativePath.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (pieces.Length == 0 || pieces.Any(p => p is "." or ".." || p.Contains('\0')))
            throw new ArgumentException("Invalid media path.", nameof(relativePath));

        var path = $"{_directory}/{string.Join("/", pieces)}";
        var apiUrl = $"https://api.github.com/repos/{_repository}/contents/{string.Join("/", path.Split('/').Select(Uri.EscapeDataString))}?ref={Uri.EscapeDataString(_branch)}";
        var client = clients.CreateClient(nameof(GitHubRepositoryMediaStorage));
        using var request = new HttpRequestMessage(HttpMethod.Get, apiUrl);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _token);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github.raw+json"));
        request.Headers.UserAgent.ParseAdd("JSO-Media-Storage/1.0");
        request.Headers.Add("X-GitHub-Api-Version", "2022-11-28");
        var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
        if (!response.IsSuccessStatusCode)
        {
            var detail = await response.Content.ReadAsStringAsync(ct);
            var status = response.StatusCode;
            response.Dispose();
            throw new HttpRequestException($"GitHub media retrieval failed ({(int)status}): {SafeDetail(detail)}", null, status);
        }
        var stream = await response.Content.ReadAsStreamAsync(ct);
        // Keep the response alive until its stream is disposed.
        return (new ResponseOwnedStream(stream, response), response.Content.Headers.ContentType?.MediaType ?? ContentTypeFor(pieces[^1]), response.Headers.ETag?.Tag);
    }

    private static string ContentTypeFor(string fileName) => Path.GetExtension(fileName).ToLowerInvariant() switch
    {
        ".jpg" or ".jpeg" => "image/jpeg",
        ".png" => "image/png",
        ".webp" => "image/webp",
        ".gif" => "image/gif",
        _ => "application/octet-stream"
    };

    private static string SafeDetail(string detail)
    {
        try
        {
            using var json = JsonDocument.Parse(detail);
            return json.RootElement.TryGetProperty("message", out var message) ? message.GetString() ?? "Request failed." : "Request failed.";
        }
        catch { return "Request failed."; }
    }

    private sealed class ResponseOwnedStream(Stream inner, HttpResponseMessage response) : Stream
    {
        public override bool CanRead => inner.CanRead;
        public override bool CanSeek => inner.CanSeek;
        public override bool CanWrite => false;
        public override long Length => inner.Length;
        public override long Position { get => inner.Position; set => inner.Position = value; }
        public override void Flush() => inner.Flush();
        public override int Read(byte[] buffer, int offset, int count) => inner.Read(buffer, offset, count);
        public override ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default) => inner.ReadAsync(buffer, cancellationToken);
        public override long Seek(long offset, SeekOrigin origin) => inner.Seek(offset, origin);
        public override void SetLength(long value) => throw new NotSupportedException();
        public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();
        protected override void Dispose(bool disposing) { if (disposing) { inner.Dispose(); response.Dispose(); } base.Dispose(disposing); }
        public override async ValueTask DisposeAsync() { await inner.DisposeAsync(); response.Dispose(); GC.SuppressFinalize(this); }
    }
}
