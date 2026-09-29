using System.Security.Cryptography;

namespace JSO.Infrastructure;

// Generates the opaque public ticket token embedded in the QR. Uses a CSPRNG
// (RandomNumberGenerator) for 32 bytes (256 bits) of entropy, encoded as
// Base64URL (no padding) so it is URL-safe and carries no PII. The token is a
// pure random identifier, never derived from TicketOrderId/FanUserId, so it
// cannot be guessed or reverse-engineered from any public reference.
public static class TicketTokenGenerator
{
    public static string Generate()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToBase64String(bytes)
            .Replace('+', '-')
            .Replace('/', '_')
            .TrimEnd('=');
    }
}
