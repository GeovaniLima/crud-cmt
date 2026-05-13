using DesafioMt.Application.Common.Abstractions;

namespace DesafioMt.Application.Products;

public record ProductDto(Guid Id, string Name, decimal UnitPrice);

public interface IProductService
{
    Task<IReadOnlyList<ProductDto>> ListAsync(string? name, CancellationToken ct = default);
}

public class ProductService : IProductService
{
    private readonly IProductRepository _repository;

    public ProductService(IProductRepository repository)
    {
        _repository = repository;
    }

    public async Task<IReadOnlyList<ProductDto>> ListAsync(string? name, CancellationToken ct = default)
    {
        var products = await _repository.ListAsync(name, ct);
        return products.Select(p => new ProductDto(p.Id, p.Name, p.UnitPrice)).ToList();
    }
}
