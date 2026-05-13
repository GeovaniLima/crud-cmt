using System.Text.Json;
using DesafioMt.Domain.Common;
using FluentValidation;

namespace DesafioMt.Api.Middleware;

// Centraliza a traducao de excecoes para respostas HTTP no formato ProblemDetails (RFC 7807).
// Convencoes deste projeto:
//   - ValidationException (FluentValidation)  -> 400 + dicionario "errors" por campo
//   - DomainNotFoundException                 -> 404
//   - DomainConflictException                 -> 409 (CPF/email duplicado, pedido > 24h, etc.)
//   - DomainException (regra de negocio)      -> 400
//   - Qualquer outra Exception                -> 500 com mensagem generica (detalhes so no log)
//
// Manter este mapeamento aqui e nao em cada controller evita boilerplate try/catch
// e garante que o front recebe sempre o mesmo formato de erro.
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (ValidationException ex)
        {
            _logger.LogWarning(ex, "Validation failed");
            var errors = ex.Errors
                .GroupBy(e => e.PropertyName)
                .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());
            await WriteProblem(context, StatusCodes.Status400BadRequest, "Validação falhou", "Um ou mais campos são inválidos.", errors);
        }
        catch (DomainNotFoundException ex)
        {
            _logger.LogInformation(ex, "Resource not found");
            await WriteProblem(context, StatusCodes.Status404NotFound, "Não encontrado", ex.Message);
        }
        catch (DomainConflictException ex)
        {
            _logger.LogInformation(ex, "Domain conflict");
            await WriteProblem(context, StatusCodes.Status409Conflict, "Conflito", ex.Message);
        }
        catch (DomainException ex)
        {
            _logger.LogInformation(ex, "Domain rule violation");
            await WriteProblem(context, StatusCodes.Status400BadRequest, "Regra de negócio violada", ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception");
            await WriteProblem(context, StatusCodes.Status500InternalServerError, "Erro interno", "Ocorreu um erro inesperado.");
        }
    }

    private static async Task WriteProblem(HttpContext context, int status, string title, string detail, IDictionary<string, string[]>? errors = null)
    {
        context.Response.StatusCode = status;
        context.Response.ContentType = "application/problem+json";

        var payload = new Dictionary<string, object?>
        {
            ["title"] = title,
            ["status"] = status,
            ["detail"] = detail
        };

        if (errors != null)
            payload["errors"] = errors;

        var json = JsonSerializer.Serialize(payload, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        await context.Response.WriteAsync(json);
    }
}

public static class ExceptionHandlingMiddlewareExtensions
{
    public static IApplicationBuilder UseExceptionHandling(this IApplicationBuilder app) =>
        app.UseMiddleware<ExceptionHandlingMiddleware>();
}
