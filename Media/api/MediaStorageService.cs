using Renci.SshNet;

namespace JSO.Media.Api;

public sealed class MediaStorageService(IConfiguration configuration)
{
    public async Task SaveAsync(Stream content, string relativePath, CancellationToken cancellationToken)
    {
        var host = Required("Sftp:Host");
        var username = Required("Sftp:Username");
        var password = Required("Sftp:Password");
        var root = Required("Sftp:RootPath").TrimEnd('/');
        var fingerprint = Required("Sftp:HostKeyFingerprint");
        var port = int.TryParse(configuration["Sftp:Port"], out var parsedPort) ? parsedPort : 22;
        var normalized = Normalize(relativePath);
        var remotePath = $"{root}/{normalized}";

        await Task.Run(() =>
        {
            using var client = CreateClient(host, port, username, password, fingerprint);
            client.Connect();
            try
            {
                var directory = remotePath[..remotePath.LastIndexOf('/')];
                EnsureDirectory(client, directory);
                client.UploadFile(content, remotePath, true);
            }
            finally { if (client.IsConnected) client.Disconnect(); }
        }, cancellationToken);
    }

    public async Task DeleteAsync(string relativePath, CancellationToken cancellationToken)
    {
        var normalized = Normalize(relativePath);
        if (!normalized.StartsWith("media/", StringComparison.Ordinal))
            throw new InvalidOperationException("Refusing to delete a path outside the managed media directory.");

        var host = Required("Sftp:Host");
        var username = Required("Sftp:Username");
        var password = Required("Sftp:Password");
        var root = Required("Sftp:RootPath").TrimEnd('/');
        var fingerprint = Required("Sftp:HostKeyFingerprint");
        var port = int.TryParse(configuration["Sftp:Port"], out var parsedPort) ? parsedPort : 22;

        await Task.Run(() =>
        {
            using var client = CreateClient(host, port, username, password, fingerprint);
            client.Connect();
            try
            {
                var path = $"{root}/{normalized}";
                if (client.Exists(path)) client.DeleteFile(path);
            }
            finally { if (client.IsConnected) client.Disconnect(); }
        }, cancellationToken);
    }

    public string PublicUrl(string relativePath) =>
        Required("Sftp:PublicBaseUrl").TrimEnd('/') + "/" + Normalize(relativePath);

    private SftpClient CreateClient(string host, int port, string username, string password, string fingerprint)
    {
        var client = new SftpClient(host, port, username, password);
        client.HostKeyReceived += (_, e) =>
        {
            var actual = Convert.ToBase64String(System.Security.Cryptography.SHA256.HashData(e.HostKey)).TrimEnd('=');
            var expected = fingerprint.Trim();
            if (expected.StartsWith("SHA256:", StringComparison.OrdinalIgnoreCase))
                expected = expected["SHA256:".Length..];
            expected = expected.TrimEnd('=');
            e.CanTrust = string.Equals(actual, expected, StringComparison.Ordinal);
        };
        return client;
    }

    private string Required(string key) =>
        configuration[key] is { Length: > 0 } value ? value : throw new InvalidOperationException($"Missing configuration: {key}");

    private static string Normalize(string path)
    {
        var safe = path.Replace('\\', '/').TrimStart('/');
        if (safe.Split('/').Any(segment => segment is "." or "..") || safe.Contains('\0'))
            throw new InvalidOperationException("Invalid storage path.");
        return safe;
    }

    private static void EnsureDirectory(SftpClient client, string directory)
    {
        // Preserve absolute document-root paths; relative roots are resolved
        // from the SFTP account's home directory.
        var isAbsolute = directory.StartsWith("/", StringComparison.Ordinal);
        var current = isAbsolute ? "/" : ".";
        foreach (var part in directory.Split('/', StringSplitOptions.RemoveEmptyEntries))
        {
            current = current switch
            {
                "/" => "/" + part,
                "." => part,
                _ => current + "/" + part
            };
            if (!client.Exists(current)) client.CreateDirectory(current);
        }
    }
}
