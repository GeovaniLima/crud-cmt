using DesafioMt.Application.Common.Abstractions;
using DesafioMt.Domain.Entities;
using DesafioMt.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DesafioMt.Infrastructure.Repositories;

public class ProductRepository : IProductRepository
{
    private readonly AppDbContext _context;

    public ProductRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<Product>> ListAsync(string? name, CancellationToken ct = default)
    {
        var query = _context.Products.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(name))
        {
            var pattern = $"%{name.Trim()}%";
            query = query.Where(p => EF.Functions.ILike(p.Name, pattern));
        }
        return await query.OrderBy(p => p.Name).ToListAsync(ct);
    }

    public Task<Product?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        _context.Products.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id, ct);
}
