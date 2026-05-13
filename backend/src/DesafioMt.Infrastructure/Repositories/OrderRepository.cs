using DesafioMt.Application.Common.Abstractions;
using DesafioMt.Domain.Entities;
using DesafioMt.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DesafioMt.Infrastructure.Repositories;

public class OrderRepository : IOrderRepository
{
    private readonly AppDbContext _context;

    public OrderRepository(AppDbContext context)
    {
        _context = context;
    }

    public Task<Order?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        _context.Orders
            .Include(o => o.Customer)
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == id, ct);

    public async Task<(IReadOnlyList<OrderListItem> Items, int Total, decimal TotalSum)> SearchAsync(
        Guid? customerId, string? customerName, DateTime? from, DateTime? to, int page, int pageSize, CancellationToken ct = default)
    {
        // AsNoTracking porque e leitura - economiza memoria e evita o ChangeTracker
        // hidratar entidades grandes quando so vamos projetar para OrderListItem.
        var query = _context.Orders.AsNoTracking().AsQueryable();

        if (customerId.HasValue)
            query = query.Where(o => o.CustomerId == customerId.Value);

        if (!string.IsNullOrWhiteSpace(customerName))
        {
            // ILike e o operador case-insensitive do Postgres - util para nomes
            // com acento/case inconsistentes. Mapeado para Npgsql.
            var pattern = $"%{customerName.Trim()}%";
            query = query.Where(o => o.Customer != null && EF.Functions.ILike(o.Customer.Name, pattern));
        }

        // Range com fim exclusivo — backend já recebe os limites convertidos para UTC
        // pelo OrderService.ToBrtRangeUtc (datas digitadas como dia BRT viram
        // [00:00 BRT, +1day 00:00 BRT) em UTC).
        if (from.HasValue) query = query.Where(o => o.OrderDate >= from.Value);
        if (to.HasValue) query = query.Where(o => o.OrderDate < to.Value);

        // Roda duas agregacoes separadas (total e soma) sobre a mesma query base.
        // EF compoe SQL otimizado: COUNT(*) e SUM(total_value) sem hidratar linhas.
        var total = await query.CountAsync(ct);
        var totalSum = await query.SumAsync(o => (decimal?)o.TotalValue, ct) ?? 0m;

        // Projecao para OrderListItem direto na query - usamos o(Items.Count() para
        // que o EF gere uma subquery COUNT no SQL ao inves de carregar todos os itens
        // em memoria. Sem isto, ItemCount viria 0 pois Items nao esta no Include.
        var items = await query
            .OrderByDescending(o => o.OrderDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(o => new OrderListItem(
                o.Id,
                o.CustomerId,
                o.Customer != null ? o.Customer.Name : null,
                o.OrderDate,
                o.TotalValue,
                o.Items.Count(),
                o.CreatedAt,
                o.UpdatedAt))
            .ToListAsync(ct);

        return (items, total, totalSum);
    }

    public async Task AddAsync(Order order, CancellationToken ct = default)
    {
        await _context.Orders.AddAsync(order, ct);
        await _context.SaveChangesAsync(ct);
    }

    // Atualizar Order com troca completa de itens nao funciona com o ChangeTracker padrao
    // do EF Core: ele compara colecoes por identidade, e como o dominio reconstroi novos
    // OrderItem (com novos Guids) a cada Update, o tracker tenta inserir os novos sem
    // remover os antigos - resultado: duplicacao.
    //
    // Solucao explicita em tres passos:
    //   1. Detach de tudo o que o GetByIdAsync trouxe (a chamada anterior do service).
    //   2. ExecuteDeleteAsync apaga todos os itens antigos via SQL direto.
    //   3. Reanexa o Order modificado e adiciona os novos itens como Added.
    // Tudo em um unico SaveChangesAsync para garantir atomicidade na transacao implicita.
    public async Task UpdateAsync(Order order, CancellationToken ct = default)
    {
        foreach (var entry in _context.ChangeTracker.Entries().ToList())
            entry.State = EntityState.Detached;

        await _context.OrderItems
            .Where(i => i.OrderId == order.Id)
            .ExecuteDeleteAsync(ct);

        _context.Orders.Attach(order);
        _context.Entry(order).State = EntityState.Modified;

        foreach (var item in order.Items)
            _context.OrderItems.Add(item);

        await _context.SaveChangesAsync(ct);
    }

    public Task<decimal> GetTotalSpentByCustomerAsync(Guid customerId, CancellationToken ct = default) =>
        _context.Orders
            .Where(o => o.CustomerId == customerId)
            .SumAsync(o => (decimal?)o.TotalValue, ct)
            .ContinueWith(t => t.Result ?? 0m, ct);

    public Task<bool> CustomerHasOrdersAsync(Guid customerId, CancellationToken ct = default) =>
        _context.Orders.AnyAsync(o => o.CustomerId == customerId, ct);
}
