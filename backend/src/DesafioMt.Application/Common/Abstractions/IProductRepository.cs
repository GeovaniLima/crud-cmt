using DesafioMt.Domain.Entities;

namespace DesafioMt.Application.Common.Abstractions;

public interface IProductRepository
{
    Task<IReadOnlyList<Product>> ListAsync(string? name, CancellationToken ct = default);

    // Usado para garantir, no boundary do pedido, que nome e preco de tabela do item
    // venham do catalogo - nao do cliente HTTP.
    Task<Product?> GetByIdAsync(Guid id, CancellationToken ct = default);
}
