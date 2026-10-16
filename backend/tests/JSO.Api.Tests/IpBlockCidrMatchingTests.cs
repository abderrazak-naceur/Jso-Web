using System.Net;
using System.Reflection;
using JSO.Api.Security;

namespace JSO.Api.Tests;

public sealed class IpBlockCidrMatchingTests
{
    private static readonly MethodInfo MatchesMethod = typeof(IpBlockEnforcementMiddleware)
        .GetMethod("Matches", BindingFlags.NonPublic | BindingFlags.Static)
        ?? throw new InvalidOperationException("CIDR matcher was not found.");

    private static bool Matches(string address, string cidr) =>
        (bool)(MatchesMethod.Invoke(null, [IPAddress.Parse(address), cidr])
            ?? throw new InvalidOperationException("CIDR matcher returned no result."));

    [Theory]
    [InlineData("192.0.2.12", "192.0.2.0/24", true)]
    [InlineData("192.0.3.12", "192.0.2.0/24", false)]
    [InlineData("192.0.2.12", "192.0.2.12/32", true)]
    [InlineData("192.0.2.13", "192.0.2.12/32", false)]
    [InlineData("10.255.255.255", "10.0.0.0/7", true)]
    [InlineData("11.0.0.1", "10.0.0.0/7", false)]
    [InlineData("2001:db8::1234", "2001:db8::/32", true)]
    [InlineData("2001:db9::1", "2001:db8::/32", false)]
    [InlineData("2001:db8::1", "2001:db8::1/128", true)]
    [InlineData("192.0.2.12", "2001:db8::/32", false)]
    [InlineData("::ffff:192.0.2.12", "192.0.2.0/24", true)]
    public void Matches_RespectsAddressFamilyAndPrefix(string address, string cidr, bool expected)
    {
        Assert.Equal(expected, Matches(address, cidr));
    }
}
