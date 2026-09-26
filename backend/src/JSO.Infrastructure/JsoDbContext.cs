using JSO.Domain; using Microsoft.EntityFrameworkCore;
namespace JSO.Infrastructure;
public sealed class JsoDbContext(DbContextOptions<JsoDbContext> options) : DbContext(options) {
 public DbSet<Club> Clubs => Set<Club>();
 public DbSet<Season> Seasons => Set<Season>();
 public DbSet<Competition> Competitions => Set<Competition>();
 public DbSet<Team> Teams => Set<Team>();
 public DbSet<Player> Players => Set<Player>();
 public DbSet<StaffMember> StaffMembers => Set<StaffMember>();
 public DbSet<Match> Matches => Set<Match>();
 public DbSet<MatchEvent> MatchEvents => Set<MatchEvent>();
 public DbSet<MatchLineup> MatchLineups => Set<MatchLineup>();
 public DbSet<MatchOfficial> MatchOfficials => Set<MatchOfficial>();
 public DbSet<MatchStat> MatchStats => Set<MatchStat>();
 public DbSet<Article> Articles => Set<Article>();
 public DbSet<ArticleMetadata> ArticleMetadata => Set<ArticleMetadata>();
 public DbSet<AdminUser> AdminUsers => Set<AdminUser>();
 public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
 public DbSet<MediaAsset> MediaAssets => Set<MediaAsset>();
 public DbSet<SiteContent> SiteContents => Set<SiteContent>();
 public DbSet<Sponsor> Sponsors => Set<Sponsor>();
 public DbSet<FanUser> FanUsers => Set<FanUser>();
 public DbSet<Product> Products => Set<Product>();
 protected override void OnModelCreating(ModelBuilder modelBuilder) {
  modelBuilder.Entity<Club>().HasIndex(x=>x.ShortName).IsUnique();
  modelBuilder.Entity<Season>().HasIndex(x=>x.Name).IsUnique();
  modelBuilder.Entity<Article>().HasIndex(x=>x.Slug).IsUnique();
  modelBuilder.Entity<Match>().HasIndex(x=>new{x.KickoffAt,x.Status});
  modelBuilder.Entity<Player>().HasIndex(x=>new{x.TeamId,x.ShirtNumber});
  modelBuilder.Entity<AdminUser>().HasIndex(x=>x.Email).IsUnique();
  modelBuilder.Entity<AuditLog>().HasIndex(x=>x.CreatedAt);
  modelBuilder.Entity<AuditLog>().HasIndex(x=>new{x.EntityType,x.EntityId});
  modelBuilder.Entity<MediaAsset>().HasIndex(x=>x.CreatedAt);
  modelBuilder.Entity<SiteContent>().HasIndex(x=>x.Key).IsUnique();
  modelBuilder.Entity<ArticleMetadata>().HasIndex(x=>x.ArticleId).IsUnique();
  modelBuilder.Entity<MatchLineup>().HasIndex(x=>new{x.MatchId,x.PlayerId}).IsUnique();
  modelBuilder.Entity<MatchOfficial>().HasIndex(x=>x.MatchId);
  modelBuilder.Entity<MatchStat>().HasIndex(x=>new{x.MatchId,x.Name}).IsUnique();
  modelBuilder.Entity<Sponsor>().HasIndex(x=>new{x.Placement,x.IsActive,x.Priority});
  modelBuilder.Entity<FanUser>().HasIndex(x=>x.Email).IsUnique();
  modelBuilder.Entity<Product>().HasIndex(x=>x.Slug).IsUnique();
  modelBuilder.Entity<Product>().HasIndex(x=>new{x.IsActive,x.Category});
  modelBuilder.Entity<Product>().Property(x=>x.Price).HasPrecision(14,2);
  modelBuilder.Entity<Club>().HasData(new Club { Id=Guid.Parse("8d8c1ef6-1c9d-4d1c-9a0f-8a5b6b5c1001"), Name="Jeunesse Sportive de Oudhref", ShortName="JSO", Country="Tunisie", City="Oudhref" });
 }
}
