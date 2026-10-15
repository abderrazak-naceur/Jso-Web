using System.Net;
using System.Net.Mail;
using System.Security.Cryptography;
using System.Text;
using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
namespace JSO.Api.Controllers;
// Public reset endpoints deliberately return generic request acknowledgements to avoid account enumeration.
public sealed record PasswordResetRequest(string Email);
public sealed record PasswordResetSubmit(string Email,string Token,string NewPassword);
[ApiController]
[Route("api/password-recovery")]
public sealed class PasswordRecoveryController(JsoDbContext db,IConfiguration config,ILogger<PasswordRecoveryController> log,AuditService audit):ControllerBase
{
 const string Generic="If an active account exists for this email, a reset link will be sent shortly.";
 [HttpPost("{userType}/request"),EnableRateLimiting("auth-login")]
 public async Task<IActionResult> RequestReset(string userType,PasswordResetRequest request,CancellationToken ct)
 {
  var type=TypeOf(userType);var email=request.Email?.Trim().ToLowerInvariant();
  if(type is null||string.IsNullOrWhiteSpace(email)||email.Length>254||!email.Contains('@'))return BadRequest(new{message="A valid account type and email are required."});
  var exists=type=="admin"?await db.AdminUsers.AnyAsync(x=>x.Email==email&&x.IsActive,ct):await db.FanUsers.AnyAsync(x=>x.Email==email&&x.IsActive,ct);
  if(!exists)return Ok(new{message=Generic});
  var old=await db.PasswordResetTokens.Where(x=>x.UserType==type&&x.Email==email&&x.UsedAt==null).ToListAsync(ct);db.PasswordResetTokens.RemoveRange(old);
  var raw=Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).TrimEnd('=').Replace('+','-').Replace('/','_');
  db.PasswordResetTokens.Add(new PasswordResetToken{UserType=type,Email=email,TokenHash=Hash(raw),ExpiresAt=DateTimeOffset.UtcNow.AddMinutes(30)});await db.SaveChangesAsync(ct);
  var frontend=config["PasswordReset:FrontendUrl"]?.TrimEnd('/');var host=config["Email:SmtpHost"];var from=config["Email:From"];
  if(string.IsNullOrWhiteSpace(frontend)||string.IsNullOrWhiteSpace(host)||string.IsNullOrWhiteSpace(from)){
   log.LogError("Password recovery email configuration is missing.");
   var pending=await db.PasswordResetTokens.SingleOrDefaultAsync(x=>x.UserType==type&&x.Email==email&&x.TokenHash==Hash(raw),ct);
   if(pending is not null)db.PasswordResetTokens.Remove(pending);
   await db.SaveChangesAsync(ct);
   return Ok(new{message=Generic});
  }
  var link=$"{frontend}/password-reset?type={type}&email={Uri.EscapeDataString(email)}&token={Uri.EscapeDataString(raw)}";
  try{using var mail=new MailMessage(from,email){Subject="JSO — Réinitialisation du mot de passe",Body=$"Ouvrez ce lien pour réinitialiser votre mot de passe (valable 30 minutes, une seule utilisation) :\n\n{link}\n\nIgnorez ce message si vous n'avez rien demandé."};using var smtp=new SmtpClient(host,int.TryParse(config["Email:SmtpPort"],out var port)?port:587){EnableSsl=!string.Equals(config["Email:EnableSsl"],"false",StringComparison.OrdinalIgnoreCase),Timeout=10000};var user=config["Email:Username"];if(!string.IsNullOrWhiteSpace(user))smtp.Credentials=new NetworkCredential(user,config["Email:Password"]??"");await smtp.SendMailAsync(mail,ct);}
  catch(Exception ex){log.LogError(ex,"Could not send password reset email.");var stored=await db.PasswordResetTokens.SingleOrDefaultAsync(x=>x.UserType==type&&x.Email==email&&x.TokenHash==Hash(raw),ct);if(stored is not null)db.PasswordResetTokens.Remove(stored);await db.SaveChangesAsync(ct);return Ok(new{message=Generic});}
  return Ok(new{message=Generic});
 }
 [HttpPost("{userType}/reset"),EnableRateLimiting("auth-login")]
 public async Task<IActionResult> Reset(string userType,PasswordResetSubmit request,CancellationToken ct)
 {
  var type=TypeOf(userType);var email=request.Email?.Trim().ToLowerInvariant();if(type is null||string.IsNullOrWhiteSpace(email)||string.IsNullOrWhiteSpace(request.Token))return BadRequest(new{message="The reset link is invalid or expired."});
  if(string.IsNullOrWhiteSpace(request.NewPassword)||request.NewPassword.Length<12||request.NewPassword.Length>128)return BadRequest(new{message="Le mot de passe doit contenir entre 12 et 128 caractères."});
  var now=DateTimeOffset.UtcNow;var hash=Hash(request.Token);var reset=await db.PasswordResetTokens.SingleOrDefaultAsync(x=>x.UserType==type&&x.Email==email&&x.TokenHash==hash&&x.UsedAt==null&&x.ExpiresAt>now,ct);if(reset is null)return BadRequest(new{message="The reset link is invalid or expired."});
  if(type=="admin"){var u=await db.AdminUsers.SingleOrDefaultAsync(x=>x.Email==email&&x.IsActive,ct);if(u is null)return BadRequest(new{message="The reset link is invalid or expired."});u.PasswordHash=PasswordHasher.Hash(request.NewPassword);await audit.LogAsync("RESET_PASSWORD","AdminUser",u.Id.ToString(),u.Id.ToString(),u.Email,HttpContext.Connection.RemoteIpAddress?.ToString(),ct:ct);}
  else{var u=await db.FanUsers.SingleOrDefaultAsync(x=>x.Email==email&&x.IsActive,ct);if(u is null)return BadRequest(new{message="The reset link is invalid or expired."});u.PasswordHash=PasswordHasher.Hash(request.NewPassword);await audit.LogAsync("RESET_PASSWORD","FanUser",u.Id.ToString(),u.Id.ToString(),u.Email,HttpContext.Connection.RemoteIpAddress?.ToString(),ct:ct);}
  reset.UsedAt=now;var siblings=await db.PasswordResetTokens.Where(x=>x.UserType==type&&x.Email==email&&x.Id!=reset.Id&&x.UsedAt==null).ToListAsync(ct);db.PasswordResetTokens.RemoveRange(siblings);await db.SaveChangesAsync(ct);return Ok(new{message="Mot de passe mis à jour. Vous pouvez vous connecter."});
 }
 static string? TypeOf(string value)=>value.Equals("admin",StringComparison.OrdinalIgnoreCase)?"admin":value.Equals("fan",StringComparison.OrdinalIgnoreCase)?"fan":null;
 static string Hash(string token)=>Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}
