using DesafioMt.Application.Common.Abstractions;
using DesafioMt.Infrastructure.Persistence;
using DesafioMt.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;

namespace DesafioMt.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException("Connection string 'DefaultConnection' não configurada.");

        // Path Render(Oregon) -> Supabase(SP) atravessa NAT/firewall que derruba TCP
        // ocioso. Sem keepalive, a proxima query de uma mesma request falha de forma
        // brusca e o cliente ve ERR_CONNECTION_CLOSED. Forcamos os parametros aqui
        // para nao depender de ajuste manual na env var do Render.
        var csb = new NpgsqlConnectionStringBuilder(connectionString)
        {
            KeepAlive = 30,
            TcpKeepAlive = true,
            CommandTimeout = 20,
        };
        connectionString = csb.ConnectionString;

        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(connectionString, npgsql =>
            {
                npgsql.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName);
                // Cross-continent SP<->Oregon: 3 retries x 5s podiam empilhar 15s e
                // estourar o timeout do proxy do Render mid-request. 1 retry curto
                // ainda absorve flake transitorio sem segurar a request o suficiente
                // pra conexao ser fechada.
                npgsql.EnableRetryOnFailure(maxRetryCount: 1, maxRetryDelay: TimeSpan.FromMilliseconds(500), errorCodesToAdd: null);
            }));

        services.AddScoped<ICustomerRepository, CustomerRepository>();
        services.AddScoped<IOrderRepository, OrderRepository>();
        services.AddScoped<IProductRepository, ProductRepository>();

        return services;
    }
}
