using System.Security.Cryptography;
using System.Text;
using Renci.SshNet;

namespace JSO.Api.Services;

public sealed class MediaStorageService(IConfiguration configuration, IWebHostEnvironment environment)
{
    public async Task<StoredMediaFile> SaveAsync(IFormFile file, string relativePath, CancellationToken ct)
    {
        var relative = Normalize(relativePath);
        try
        {
            if (!string.IsNullOrWhiteSpace(configuration["Sftp:Host"]))
            {
                var remote = CombineRemote(Required("Sftp:RootPath"), relative);
                await Task.Run(() =>
                {
                    using var client = CreateClient();
                    client.Connect();
                    try
                    {
                        EnsureDirectory(client, remote[..remote.LastIndexOf('/')]);
                        using var input = file.OpenReadStream();
                        client.UploadFile(input, remote, true);
                    }
                    finally { if (client.IsConnected) client.Disconnect(); }
                }, ct);
                return new StoredMediaFile(Required("Sftp:PublicBaseUrl").TrimEnd('/') + "/" + relative, "sftp:" + relative);
            }

            var legacy = "uploads/" + relative;
            var root = Path.GetFullPath(Path.Combine(environment.ContentRootPath, "uploads"));
            var path = Path.GetFullPath(Path.Combine(environment.ContentRootPath, legacy.Replace('/', Path.DirectorySeparatorChar)));
            if (!path.StartsWith(root + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)) throw new InvalidOperationException("Invalid path.");
            Directory.CreateDirectory(Path.GetDirectoryName(path)!);
            await using var output = System.IO.File.Create(path);
            await file.CopyToAsync(output, ct);
            return new StoredMediaFile("/" + legacy, legacy);
        }
        catch (OperationCanceledException) { throw; }
        catch (Exception ex) { throw new MediaStorageException("Media upload failed.", ex); }
    }

    public async Task DeleteAsync(string storagePath, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(storagePath)) return;
        try
        {
            if (storagePath.StartsWith("sftp:", StringComparison.OrdinalIgnoreCase))
            {
                if (string.IsNullOrWhiteSpace(configuration["Sftp:Host"])) throw new InvalidOperationException("SFTP is not configured.");
                var remote = CombineRemote(Required("Sftp:RootPath"), Normalize(storagePath["sftp:".Length..]));
                await Task.Run(() =>
                {
                    using var client = CreateClient();
                    client.Connect();
                    try { if (client.Exists(remote)) client.DeleteFile(remote); }
                    finally { if (client.IsConnected) client.Disconnect(); }
                }, ct);
                return;
            }

            var legacy = Normalize(storagePath);
            if (!legacy.StartsWith("uploads/", StringComparison.OrdinalIgnoreCase)) throw new InvalidOperationException("Unsupported legacy path.");
            var root = Path.GetFullPath(Path.Combine(environment.ContentRootPath, "uploads"));
            var path = Path.GetFullPath(Path.Combine(environment.ContentRootPath, legacy.Replace('/', Path.DirectorySeparatorChar)));
            if (!path.StartsWith(root + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)) throw new InvalidOperationException("Invalid path.");
            await Task.Run(() => { ct.ThrowIfCancellationRequested(); if (System.IO.File.Exists(path)) System.IO.File.Delete(path); }, ct);
        }
        catch (OperationCanceledException) { throw; }
        catch (Exception ex) { throw new MediaStorageException("Media deletion failed.", ex); }
    }

    private string Required(string key) => !string.IsNullOrWhiteSpace(configuration[key])
        ? configuration[key]!.Trim() : throw new InvalidOperationException("Missing configuration: " + key);

    private SftpClient CreateClient()
    {
        var host = Required("Sftp:Host");
        var user = Required("Sftp:Username");
        var password = Required("Sftp:Password");
        var fingerprint = Required("Sftp:HostKeyFingerprint").Trim().Replace(" ", "").TrimEnd('=');
        var publicBase = Required("Sftp:PublicBaseUrl");
        _ = Required("Sftp:RootPath");
        if (!fingerprint.StartsWith("SHA256:", StringComparison.Ordinal)) throw new InvalidOperationException("Sftp:HostKeyFingerprint must use SHA256 format.");
        if (!Uri.TryCreate(publicBase, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps) throw new InvalidOperationException("Sftp:PublicBaseUrl must be HTTPS.");
        if (!int.TryParse(configuration["Sftp:Port"], out var port)) port = 22;
        if (port < 1 || port > 65535) throw new InvalidOperationException("Invalid SFTP port.");
        var client = new SftpClient(host, port, user, password);
        client.HostKeyReceived += (_, e) =>
        {
            var actual = "SHA256:" + Convert.ToBase64String(SHA256.HashData(e.HostKey)).TrimEnd('=');
            var a = Encoding.UTF8.GetBytes(actual); var b = Encoding.UTF8.GetBytes(fingerprint);
            e.CanTrust = a.Length == b.Length && CryptographicOperations.FixedTimeEquals(a, b);
        };
        return client;
    }

    private static string Normalize(string value)
    {
        var parts = value.Replace('\\', '/').TrimStart('/').Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length == 0 || parts.Any(x => x is "." or ".." || x.Contains(':'))) throw new InvalidOperationException("Invalid media path.");
        return string.Join('/', parts);
    }

    private static string CombineRemote(string root, string relative)
    {
        var clean = root.Trim().Replace('\\', '/').TrimEnd('/');
        if (clean.Length == 0 || clean.Contains("..", StringComparison.Ordinal)) throw new InvalidOperationException("Invalid SFTP root path.");
        return (clean.StartsWith('/') ? clean : "/" + clean) + "/" + relative;
    }

    private static void EnsureDirectory(SftpClient client, string directory)
    {
        var current = directory.StartsWith('/') ? "/" : "";
        foreach (var part in directory.Split('/', StringSplitOptions.RemoveEmptyEntries))
        {
            current = current == "/" ? "/" + part : current.Length == 0 ? part : current + "/" + part;
            if (!client.Exists(current)) client.CreateDirectory(current);
        }
    }
}
public sealed record StoredMediaFile(string PublicUrl, string StoragePath);
public sealed class MediaStorageException(string message, Exception innerException) : Exception(message, innerException);
