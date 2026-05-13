using DesafioMt.Domain.Entities;

namespace DesafioMt.Application.Common.Abstractions;

public interface IOrderRepository
{
    Task<Order?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<(IReadOnlyList<OrderListItem> Items, int Total, decimal TotalSum)> SearchAsync(
        Guid? customerId, string? customerName, DateTime? from, DateTime? to, int page, int pageSize, CancellationToken ct = default);
    Task AddAsync(Order order, CancellationToken ct = default);
    Task UpdateAsync(Order order, CancellationToken ct = default);
    Task<decimal> GetTotalSpentByCustomerAsync(Guid customerId, CancellationToken ct = default);
    Task<bool> CustomerHasOrdersAsync(Guid customerId, CancellationToken ct = default);
}
