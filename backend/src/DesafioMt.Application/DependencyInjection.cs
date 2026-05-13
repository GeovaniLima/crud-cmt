using System.Reflection;
using DesafioMt.Application.Customers;
using DesafioMt.Application.Orders;
using DesafioMt.Application.Products;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace DesafioMt.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddValidatorsFromAssembly(Assembly.GetExecutingAssembly());

        services.AddScoped<ICustomerService, CustomerService>();
        services.AddScoped<IOrderService, OrderService>();
        services.AddScoped<IProductService, ProductService>();

        return services;
    }
}
