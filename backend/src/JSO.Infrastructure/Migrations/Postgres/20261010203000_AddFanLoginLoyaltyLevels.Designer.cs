using JSO.Infrastructure;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JSO.Infrastructure.Migrations.Postgres
{
    [DbContext(typeof(JsoDbContext))]
    [Migration("20261010203000_AddFanLoginLoyaltyLevels")]
    public partial class AddFanLoginLoyaltyLevels
    {
    }
}