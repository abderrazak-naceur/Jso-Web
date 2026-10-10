using JSO.Infrastructure;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JSO.Infrastructure.Migrations.Postgres
{
    [DbContext(typeof(JsoDbContext))]
    [Migration("20261011003000_AddFanProfilePhoto")]
    partial class AddFanProfilePhoto
    {
        protected override void BuildTargetModel(ModelBuilder modelBuilder)
        {
            // The current model snapshot is authoritative; the migration adds
            // one nullable profile-photo URL to the existing FanUsers table.
            modelBuilder.HasAnnotation("ProductVersion", "10.0.0");
        }
    }
}