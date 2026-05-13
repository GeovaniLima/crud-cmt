using DesafioMt.Application.Common.Abstractions;
using DesafioMt.Domain.Common;
using DesafioMt.Domain.Entities;
using DesafioMt.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Npgsql;

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
        try
        {
            await _context.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (IsForeignKeyViolation(ex, "orders_customer_fk"))
        {
            // Cliente nao existe - retornamos 404 amigavel em vez de 500.
            // Sem isso o usuario veria erro generico.
            throw new DomainNotFoundException("Cliente não encontrado.");
        }
    }

    // Detecta violacao de chave estrangeira (SqlState 23503). Usado para traduzir
    // erros do banco em mensagens amigaveis quando nao pre-validamos a existencia
    // do recurso pai (otimizacao para evitar round-trip cross-region).
    private static bool IsForeignKeyViolation(DbUpdateException ex, string constraintName) =>
        ex.InnerException is PostgresException pgEx
            && pgEx.SqlState == "23503"
            && pgEx.ConstraintName == constraintName;

    // Atualizar Order com troca completa de itens: o GetByIdAsync (passo anterior
    // na service) trouxe Order + Items tracked. O Order.Update() do dominio mutou
    // as propriedades do Order e SUBSTITUIU a colecao _items por uma nova - os
    // antigos viraram orfaos no tracker (nao estao mais na navegacao, mas ainda
    // sao trackeados como Unchanged).
    //
    // Estrategia: marcar os orfaos como Deleted e os novos como Added, deixando
    // o EF gerar DELETEs + UPDATE + INSERTs em UM unico SaveChanges (transacao
    // implicita). Custo: 1 round-trip cross-continent em vez de 2 que eram
    // anteriores (ExecuteDeleteAsync + SaveChangesAsync). Critico cross-region:
    // cada RT custa ~180ms SP<->Oregon.
    public async Task UpdateAsync(Order order, CancellationToken ct = default)
    {
        var orphans = _context.ChangeTracker.Entries<OrderItem>()
            .Where(e => e.Entity.OrderId == order.Id && e.State == EntityState.Unchanged)
            .Select(e => e.Entity)
            .ToList();

        foreach (var orphan in orphans)
            _context.OrderItems.Remove(orphan);

        foreach (var item in order.Items)
        {
            // Os itens novos (Guids novos do BuildItemsForUpdate) nao estao tracked.
            // Se DetectChanges ja marcou como Added via navegacao, Add e idempotente.
            if (_context.Entry(item).State == EntityState.Detached)
                _context.OrderItems.Add(item);
        }

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
