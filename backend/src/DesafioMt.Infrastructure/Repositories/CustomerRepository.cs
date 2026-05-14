using DesafioMt.Application.Common.Abstractions;
using DesafioMt.Domain.Common;
using DesafioMt.Domain.Entities;
using DesafioMt.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace DesafioMt.Infrastructure.Repositories;

public class CustomerRepository : ICustomerRepository
{
    private readonly AppDbContext _context;

    public CustomerRepository(AppDbContext context)
    {
        _context = context;
    }

    public Task<Customer?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        _context.Customers.FirstOrDefaultAsync(c => c.Id == id, ct);

    public Task<Customer?> GetByCpfAsync(string cpf, CancellationToken ct = default) =>
        _context.Customers.FirstOrDefaultAsync(c => c.Cpf == cpf, ct);

    public Task<Customer?> GetByEmailAsync(string email, CancellationToken ct = default) =>
        _context.Customers.FirstOrDefaultAsync(c => c.Email == email.ToLower(), ct);

    public async Task<(IReadOnlyList<Customer> Items, int Total)> SearchAsync(string? name, int page, int pageSize, CancellationToken ct = default)
    {
        var query = _context.Customers.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(name))
        {
            var pattern = $"%{name.Trim()}%";
            query = query.Where(c => EF.Functions.ILike(c.Name, pattern));
        }

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderBy(c => c.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return (items, total);
    }

    public async Task AddAsync(Customer customer, CancellationToken ct = default)
    {
        await _context.Customers.AddAsync(customer, ct);
        try
        {
            await _context.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (TryGetUniqueViolation(ex, out var constraint))
        {
            throw new DomainConflictException(MessageForConstraint(constraint));
        }
    }

    public async Task UpdateAsync(Customer customer, CancellationToken ct = default)
    {
        _context.Customers.Update(customer);
        try
        {
            await _context.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (TryGetUniqueViolation(ex, out var constraint))
        {
            throw new DomainConflictException(MessageForConstraint(constraint, isUpdate: true));
        }
    }

    // Postgres devolve SqlState "23505" em violacoes de UNIQUE; o ConstraintName
    // identifica QUAL constraint (CPF ou e-mail). Trocamos pelo DomainConflictException
    // que o middleware converte em HTTP 409. Isso elimina os pre-checks por SELECT,
    // economizando 2 round-trips de banco em cada criacao/atualizacao.
    private static bool TryGetUniqueViolation(DbUpdateException ex, out string constraintName)
    {
        constraintName = string.Empty;
        if (ex.InnerException is PostgresException pgEx && pgEx.SqlState == "23505")
        {
            constraintName = pgEx.ConstraintName ?? string.Empty;
            return true;
        }
        return false;
    }

    private static string MessageForConstraint(string constraintName, bool isUpdate = false)
    {
        var qualifier = isUpdate ? "outro " : "um ";
        return constraintName switch
        {
            "customers_cpf_unique" => $"Já existe {qualifier}cliente com este CPF.",
            "customers_email_unique" => $"Já existe {qualifier}cliente com este e-mail.",
            _ => "Já existe registro com um dos campos únicos."
        };
    }

    public async Task DeleteAsync(Customer customer, CancellationToken ct = default)
    {
        _context.Customers.Remove(customer);
        await _context.SaveChangesAsync(ct);
    }

    public Task<bool> CpfExistsAsync(string cpf, Guid? excludingId = null, CancellationToken ct = default) =>
        _context.Customers.AnyAsync(c => c.Cpf == cpf && (excludingId == null || c.Id != excludingId), ct);

    public Task<bool> EmailExistsAsync(string email, Guid? excludingId = null, CancellationToken ct = default) =>
        _context.Customers.AnyAsync(c => c.Email == email.ToLower() && (excludingId == null || c.Id != excludingId), ct);
}
