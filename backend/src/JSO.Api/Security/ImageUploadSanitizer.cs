using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Formats.Png;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.PixelFormats;

namespace JSO.Api.Security;

/// <summary>
/// Decodes uploaded images and re-encodes them, stripping arbitrary payloads
/// and metadata instead of storing the original user-supplied bytes.
/// </summary>
public static class ImageUploadSanitizer
{
    private const int MaxDimension = 12_000;
    private const long MaxPixels = 40_000_000;
    private const int MaxBytes = 10 * 1024 * 1024;

    public static async Task<byte[]> SanitizeAsync(
        Stream input,
        string contentType,
        CancellationToken cancellationToken)
    {
        try
        {
            await using var source = new MemoryStream();
            await input.CopyToAsync(source, cancellationToken);
            if (source.Length == 0 || source.Length > MaxBytes)
                throw new InvalidDataException("Image exceeds the allowed input size.");

            source.Position = 0;
            var info = await Image.IdentifyAsync(source, cancellationToken);
            if (info is null || info.Width <= 0 || info.Height <= 0 ||
                info.Width > MaxDimension || info.Height > MaxDimension ||
                (long)info.Width * info.Height > MaxPixels)
                throw new InvalidDataException("Image dimensions are invalid or exceed the allowed limit.");

            source.Position = 0;
            using var image = await Image.LoadAsync<Rgba32>(source, cancellationToken);
            await using var output = new MemoryStream();
            switch (contentType.ToLowerInvariant())
            {
                case "image/jpeg":
                    await image.SaveAsync(output, new JpegEncoder(), cancellationToken);
                    break;
                case "image/png":
                    await image.SaveAsync(output, new PngEncoder(), cancellationToken);
                    break;
                case "image/webp":
                    await image.SaveAsync(output, new WebpEncoder(), cancellationToken);
                    break;
                default:
                    throw new InvalidDataException("Unsupported image format.");
            }

            if (output.Length == 0 || output.Length > MaxBytes)
                throw new InvalidDataException("Sanitized image exceeds the allowed output size.");

            return output.ToArray();
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (OutOfMemoryException)
        {
            throw;
        }
        catch (InvalidDataException)
        {
            throw;
        }
        catch (Exception exception)
        {
            throw new InvalidDataException("The uploaded file is not a valid supported image.", exception);
        }
    }
}
