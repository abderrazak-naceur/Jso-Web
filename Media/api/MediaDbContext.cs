using Microsoft.EntityFrameworkCore;

namespace JSO.Media.Api;

// Maps existing JSO tables only. This context deliberately has no migration or
// database-initialization code: the production schema is owned by JSO.
public sealed class MediaDbContext(DbContextOptions<MediaDbContext> options) : DbContext(options)
{
    public DbSet<MediaAsset> MediaAssets => Set<MediaAsset>();
    public DbSet<AdminAccess> AdminUsers => Set<AdminAccess>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var media = modelBuilder.Entity<MediaAsset>();
        media.ToTable("MediaAssets");
        media.HasKey(x => x.Id);
        media.Property(x => x.Title).IsRequired();
        media.Property(x => x.Url).IsRequired();
        media.Property(x => x.Type).IsRequired();
        media.Property(x => x.CreatedAt).HasColumnType("timestamp with time zone");

        // Only the fields needed for authorization are mapped. No writes or
        // schema changes are performed against the existing AdminUsers table.
        var admin = modelBuilder.Entity<AdminAccess>();
        admin.ToTable("AdminUsers");
        admin.HasKey(x => x.Id);
        admin.Property(x => x.Role).IsRequired();
    }
}

public sealed class AdminAccess
{
    public Guid Id { get; set; }
    public string Role { get; set; } = "";
    public bool IsActive { get; set; }
}

public sealed class MediaAsset
{
    public Guid Id { get; set; }
    public string Title { get; set; } = "";
    public string Url { get; set; } = "";
    public string Type { get; set; } = "Image";
    public string? ThumbnailUrl { get; set; }
    public string? Caption { get; set; }
    public bool IsPublished { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public string? FileName { get; set; }
    public string? ContentType { get; set; }
    public long? FileSize { get; set; }
    public string? StoragePath { get; set; }
}
