using DesafioMt.Domain.Entities;

namespace DesafioMt.Application.Common.Abstractions;

public interface ICustomerRepository
{
    Task<Customer?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Customer?> GetByCpfAsync(string cpf, CancellationToken ct = default);
    Task<Customer?> GetByEmailAsync(string email, CancellationToken ct = default);
    Task<(IReadOnlyList<Customer> Items, int Total)> SearchAsync(string? name, int page, int pageSize, CancellationToken ct = default);
    Task AddAsync(Customer customer, CancellationToken ct = default);
    Task UpdateAsync(Customer customer, CancellationToken ct = default);
    Task DeleteAsync(Customer customer, CancellationToken ct = default);
    Task<bool> CpfExistsAsync(string cpf, Guid? excludingId = null, CancellationToken ct = default);
    Task<bool> EmailExistsAsync(string email, Guid? excludingId = null, CancellationToken ct = default);
}
