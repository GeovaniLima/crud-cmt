using DesafioMt.Application.Common.Abstractions;
using DesafioMt.Application.Customers.Dtos;
using DesafioMt.Domain.Common;
using DesafioMt.Domain.Entities;
using DesafioMt.Domain.ValueObjects;
using FluentValidation;

namespace DesafioMt.Application.Customers;

public interface ICustomerService
{
    Task<CustomerDto> CreateAsync(CreateCustomerDto dto, CancellationToken ct = default);
    Task<CustomerDto> UpdateAsync(Guid id, UpdateCustomerDto dto, CancellationToken ct = default);
    Task<CustomerDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<(IReadOnlyList<CustomerDto> Items, int Total)> SearchAsync(string? name, int page, int pageSize, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
    Task<decimal> GetTotalSpentAsync(Guid id, CancellationToken ct = default);
}

public class CustomerService : ICustomerService
{
    private readonly ICustomerRepository _repository;
    private readonly IOrderRepository _orders;
    private readonly IValidator<CreateCustomerDto> _createValidator;
    private readonly IValidator<UpdateCustomerDto> _updateValidator;

    public CustomerService(
        ICustomerRepository repository,
        IOrderRepository orders,
        IValidator<CreateCustomerDto> createValidator,
        IValidator<UpdateCustomerDto> updateValidator)
    {
        _repository = repository;
        _orders = orders;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
    }

    public async Task<CustomerDto> CreateAsync(CreateCustomerDto dto, CancellationToken ct = default)
    {
        // FluentValidation cuida do formato/preenchimento dos campos (boundary).
        // Apos passar daqui, montamos os Value Objects, que aplicam regras de dominio
        // (checksum de CPF, formato de CEP, idade >=18 dentro de Customer).
        await _createValidator.ValidateAndThrowAsync(dto, ct);

        var cpf = new Cpf(dto.Cpf);
        var address = MapAddress(dto.Address);
        var customer = new Customer(dto.Name, dto.Email, dto.BirthDate, cpf, address);

        // Otimizacao: confiamos na constraint UNIQUE do banco em vez de pre-checar.
        // Antes faziamos 2 SELECTs (CpfExists, EmailExists) + INSERT = 3 round-trips.
        // Em latencia cross-region (~180ms por round-trip), isso virava ~540ms.
        // Agora e 1 round-trip soh; o repository traduz a violacao 23505 em
        // DomainConflictException com a mensagem certa.
        await _repository.AddAsync(customer, ct);

        return MapToDto(customer);
    }

    public async Task<CustomerDto> UpdateAsync(Guid id, UpdateCustomerDto dto, CancellationToken ct = default)
    {
        await _updateValidator.ValidateAndThrowAsync(dto, ct);

        var customer = await _repository.GetByIdAsync(id, ct)
            ?? throw new DomainNotFoundException("Cliente não encontrado.");

        var cpf = new Cpf(dto.Cpf);
        var address = MapAddress(dto.Address);

        customer.Update(dto.Name, dto.Email, dto.BirthDate, cpf, address);
        await _repository.UpdateAsync(customer, ct);

        return MapToDto(customer);
    }

    public async Task<CustomerDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var customer = await _repository.GetByIdAsync(id, ct);
        return customer is null ? null : MapToDto(customer);
    }

    public async Task<(IReadOnlyList<CustomerDto> Items, int Total)> SearchAsync(string? name, int page, int pageSize, CancellationToken ct = default)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;
        if (pageSize > 200) pageSize = 200;

        var (items, total) = await _repository.SearchAsync(name, page, pageSize, ct);
        return (items.Select(MapToDto).ToList(), total);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var customer = await _repository.GetByIdAsync(id, ct)
            ?? throw new DomainNotFoundException("Cliente não encontrado.");

        // Bloqueio explicito antes de tentar deletar - retorna 409 com mensagem util.
        // O banco tem FK ON DELETE RESTRICT em orders.customer_id, que cobre o caso
        // de uma deleção concorrente passar por aqui. Manter os dois (app + db) e
        // defesa em profundidade.
        if (await _orders.CustomerHasOrdersAsync(id, ct))
            throw new DomainConflictException("Cliente possui pedidos e não pode ser removido.");

        await _repository.DeleteAsync(customer, ct);
    }

    public async Task<decimal> GetTotalSpentAsync(Guid id, CancellationToken ct = default)
    {
        _ = await _repository.GetByIdAsync(id, ct)
            ?? throw new DomainNotFoundException("Cliente não encontrado.");
        return await _orders.GetTotalSpentByCustomerAsync(id, ct);
    }

    private static Address MapAddress(AddressDto dto) =>
        new(dto.Street, dto.Number, dto.Complement, dto.Neighborhood, dto.City, dto.State, dto.ZipCode);

    private static CustomerDto MapToDto(Customer c) => new()
    {
        Id = c.Id,
        Name = c.Name,
        Email = c.Email,
        BirthDate = c.BirthDate,
        Age = CalculateAge(c.BirthDate),
        Cpf = c.Cpf,
        CpfFormatted = c.CpfFormatted,
        Address = new AddressDto
        {
            Street = c.Address.Street,
            Number = c.Address.Number,
            Complement = c.Address.Complement,
            Neighborhood = c.Address.Neighborhood,
            City = c.Address.City,
            State = c.Address.State,
            ZipCode = c.Address.ZipCode
        },
        CreatedAt = c.CreatedAt,
        UpdatedAt = c.UpdatedAt
    };

    private static int CalculateAge(DateOnly birthDate)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var age = today.Year - birthDate.Year;
        if (birthDate > today.AddYears(-age)) age--;
        return age;
    }
}
