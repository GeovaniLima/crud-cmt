using System.Text.RegularExpressions;
using DesafioMt.Api.Middleware;
using DesafioMt.Application;
using DesafioMt.Infrastructure;
using DesafioMt.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Logging estruturado com Serilog
builder.Host.UseSerilog((ctx, lc) => lc
    .ReadFrom.Configuration(ctx.Configuration)
    .WriteTo.Console());

// CORS - precisamos liberar dois cenarios:
//   - http://localhost:4200 (Angular dev server local)
//   - https://*.vercel.app   (preview deployments da Vercel: cada PR gera uma URL nova)
// O metodo padrao .WithOrigins(...) so aceita strings exatas, entao montamos um
// SetIsOriginAllowed que combina lista exata + lista de regex (wildcard expandido).
var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:4200" };

var corsPatterns = corsOrigins
    .Where(o => o.Contains('*'))
    .Select(o => new Regex("^" + Regex.Escape(o).Replace("\\*", ".*") + "$", RegexOptions.IgnoreCase))
    .ToArray();
var corsExact = corsOrigins.Where(o => !o.Contains('*')).ToHashSet(StringComparer.OrdinalIgnoreCase);

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy => policy
        .SetIsOriginAllowed(origin =>
            corsExact.Contains(origin) || corsPatterns.Any(rx => rx.IsMatch(origin)))
        .AllowAnyHeader()
        .AllowAnyMethod());
});

// Por padrao, ASP.NET retorna 400 automaticamente quando o ModelState e invalido (antes do
// controller rodar). Desabilitamos isso para que a validacao caia em FluentValidation
// dentro dos services - assim conseguimos uma resposta de erro consistente vinda
// do ExceptionHandlingMiddleware (ProblemDetails com dicionario "errors" por campo).
builder.Services.Configure<Microsoft.AspNetCore.Mvc.ApiBehaviorOptions>(options =>
{
    options.SuppressModelStateInvalidFilter = true;
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "Desafio Tecnico API", Version = "v1" });
});

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

var app = builder.Build();

app.UseSerilogRequestLogging();

// Swagger habilitado em todos os ambientes (facilita validar o deploy)
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Desafio Tecnico API v1");
    c.RoutePrefix = "swagger";
});

app.UseCors();

// Middleware global de tratamento de exceções (DomainException, ValidationException, etc.)
app.UseExceptionHandling();

app.UseAuthorization();
app.MapControllers();

app.MapGet("/health", () => Results.Ok(new { status = "ok", timestamp = DateTime.UtcNow }));

// Ping de banco - util para confirmar conectividade pos-deploy no Render
// e detectar problemas de pooler/credenciais sem precisar abrir os logs.
app.MapGet("/health/db", async (AppDbContext db) =>
{
    try
    {
        await using var conn = db.Database.GetDbConnection();
        await conn.OpenAsync();
        var serverVersion = conn.ServerVersion;
        await conn.CloseAsync();
        return Results.Ok(new { db = "ok", serverVersion });
    }
    catch (Exception ex)
    {
        return Results.Problem(
            detail: $"{ex.GetType().Name}: {ex.Message}",
            title: "Database connection failed",
            statusCode: 500);
    }
});

app.Run();
