using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Gif;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Formats.Png;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.PixelFormats;

namespace JSO.Media.Api;

public static class ImageUploadSanitizer
{
    private const int MaxDimension = 12_000;
    private const long MaxPixels = 40_000_000;
    private const long MaxBytes = 10 * 1024 * 1024;

    public static async Task<MemoryStream> SanitizeAsync(Stream input, string contentType, CancellationToken cancellationToken)
    {
        var info = await Image.IdentifyAsync(input, cancellationToken);
        if (info is null || info.Width <= 0 || info.Height <= 0 ||
            info.Width > MaxDimension || info.Height > MaxDimension ||
            (long)info.Width * info.Height > MaxPixels)
            throw new InvalidDataException("Image dimensions are invalid or exceed the allowed limit.");

        input.Position = 0;
        using var image = await Image.LoadAsync<Rgba32>(input, cancellationToken);
        var output = new MemoryStream();
        switch (contentType.ToLowerInvariant())
        {
            case "image/jpeg": await image.SaveAsync(output, new JpegEncoder(), cancellationToken); break;
            case "image/png": await image.SaveAsync(output, new PngEncoder(), cancellationToken); break;
            case "image/gif": await image.SaveAsync(output, new GifEncoder(), cancellationToken); break;
            case "image/webp": await image.SaveAsync(output, new WebpEncoder(), cancellationToken); break;
            default: output.Dispose(); throw new InvalidDataException("Unsupported image format.");
        }

        if (output.Length == 0 || output.Length > MaxBytes)
        {
            output.Dispose();
            throw new InvalidDataException("Sanitized image exceeds the allowed file size.");
        }
        output.Position = 0;
        return output;
    }
}
