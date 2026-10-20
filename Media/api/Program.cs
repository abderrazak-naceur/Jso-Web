using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using JSO.Media.Api;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection is required.");
var provider = builder.Configuration["Database:Provider"] ?? "postgres";
if (!string.Equals(provider, "postgres", StringComparison.OrdinalIgnoreCase) &&
    !string.Equals(provider, "postgresql", StringComparison.OrdinalIgnoreCase))
    throw new InvalidOperationException("Media API requires Database:Provider=postgres.");

builder.Services.AddDbContext<MediaDbContext>(options => options.UseNpgsql(connectionString));
builder.Services.AddScoped<MediaStorageService>();

var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey) || jwtKey.Length < 32)
    throw new InvalidOperationException("Jwt:Key must be configured with at least 32 characters.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "JSO",
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "JSO.Admin",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.FromMinutes(1),
            RoleClaimType = ClaimTypes.Role
        };

        // Match the existing JSO API's revocation behavior: a valid JWT alone
        // is insufficient if the admin has been disabled or their role changed.
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = async context =>
            {
                var principal = context.Principal;
                var role = principal?.FindFirst(ClaimTypes.Role)?.Value
                    ?? principal?.FindFirst("role")?.Value;
                var subject = principal?.FindFirst("sub")?.Value
                    ?? principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (string.IsNullOrWhiteSpace(role) ||
                    string.Equals(role, "Fan", StringComparison.OrdinalIgnoreCase) ||
                    !Guid.TryParse(subject, out var adminId))
                {
                    context.Fail("An active JSO admin identity is required.");
                    return;
                }

                await using var scope = context.HttpContext.RequestServices.CreateAsyncScope();
                var db = scope.ServiceProvider.GetRequiredService<MediaDbContext>();
                var admin = await db.AdminUsers.AsNoTracking()
                    .SingleOrDefaultAsync(x => x.Id == adminId && x.IsActive, context.HttpContext.RequestAborted);

                if (admin is null || !string.Equals(admin.Role, role, StringComparison.OrdinalIgnoreCase))
                    context.Fail("The JSO admin account is inactive or its role has changed.");
            }
        };
    });

var allowedOrigins = (builder.Configuration["Cors:AllowedOrigins"] ?? "https://jso-media.com")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
    policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod()));

builder.Services.AddAuthorization();
builder.Services.AddControllers();
builder.Services.AddHealthChecks();

var app = builder.Build();
// Render terminates external HTTPS and forwards traffic to the container over HTTP.
// Do not redirect at the container layer: it has no HTTPS listener/port to redirect to.
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapGet("/", () => Results.Ok(new
{
    service = "JSO Media API",
    status = "running",
    health = "/health"
})).AllowAnonymous();
app.MapHealthChecks("/health");
app.MapControllers();
app.Run();
