using Microsoft.EntityFrameworkCore;

namespace JSO.Media.Api;

// Maps only the existing MediaAssets table. This context deliberately has no
// migration or database-initialization code: the production schema is owned by JSO.
public sealed class MediaDbContext(DbContextOptions<MediaDbContext> options) : DbContext(options)
{
    public DbSet<MediaAsset> MediaAssets => Set<MediaAsset>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<MediaAsset>();
        entity.ToTable("MediaAssets");
        entity.HasKey(x => x.Id);
        entity.Property(x => x.Title).IsRequired();
        entity.Property(x => x.Url).IsRequired();
        entity.Property(x => x.Type).IsRequired();
        entity.Property(x => x.CreatedAt).HasColumnType("timestamp with time zone");
    }
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
