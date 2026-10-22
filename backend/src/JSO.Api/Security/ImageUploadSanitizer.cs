using SkiaSharp;

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
            using var codec = SKCodec.Create(source);
            if (codec is null)
                throw new InvalidDataException("The uploaded file is not a supported image.");

            var width = codec.Info.Width;
            var height = codec.Info.Height;
            if (width <= 0 || height <= 0 ||
                width > MaxDimension || height > MaxDimension ||
                (long)width * height > MaxPixels)
                throw new InvalidDataException("Image dimensions are invalid or exceed the allowed limit.");

            cancellationToken.ThrowIfCancellationRequested();
            using var bitmap = SKBitmap.Decode(codec);
            if (bitmap is null || bitmap.Width != width || bitmap.Height != height)
                throw new InvalidDataException("The uploaded file could not be decoded.");

            var format = contentType.ToLowerInvariant() switch
            {
                "image/jpeg" => SKEncodedImageFormat.Jpeg,
                "image/png" => SKEncodedImageFormat.Png,
                "image/webp" => SKEncodedImageFormat.Webp,
                _ => throw new InvalidDataException("Unsupported image format.")
            };

            using var image = SKImage.FromBitmap(bitmap);
            using var encoded = image.Encode(format, quality: 90);
            if (encoded is null || encoded.Size == 0 || encoded.Size > MaxBytes)
                throw new InvalidDataException("Sanitized image exceeds the allowed output size.");

            cancellationToken.ThrowIfCancellationRequested();
            return encoded.ToArray();
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
