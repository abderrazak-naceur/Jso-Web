using JSO.Infrastructure;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
#nullable disable
namespace JSO.Infrastructure.Migrations.Postgres;
[DbContext(typeof(JsoDbContext))]
[Migration("20261015080000_AddPasswordResetTokens")]
public sealed class AddPasswordResetTokens:Migration{
 protected override void Up(MigrationBuilder m){m.CreateTable(name:"PasswordResetTokens",columns:t=>new{Id=t.Column<Guid>(type:"uuid",nullable:false),UserType=t.Column<string>(type:"text",nullable:false),Email=t.Column<string>(type:"text",nullable:false),TokenHash=t.Column<string>(type:"text",nullable:false),ExpiresAt=t.Column<DateTimeOffset>(type:"timestamp with time zone",nullable:false),UsedAt=t.Column<DateTimeOffset>(type:"timestamp with time zone",nullable:true),CreatedAt=t.Column<DateTimeOffset>(type:"timestamp with time zone",nullable:false)},constraints:t=>t.PrimaryKey("PK_PasswordResetTokens",x=>x.Id));m.CreateIndex(name:"IX_PasswordResetTokens_UserType_Email_TokenHash",table:"PasswordResetTokens",columns:new[]{"UserType","Email","TokenHash"},unique:true);m.CreateIndex(name:"IX_PasswordResetTokens_UserType_Email_ExpiresAt",table:"PasswordResetTokens",columns:new[]{"UserType","Email","ExpiresAt"});}
 protected override void Down(MigrationBuilder m)=>m.DropTable("PasswordResetTokens");
}