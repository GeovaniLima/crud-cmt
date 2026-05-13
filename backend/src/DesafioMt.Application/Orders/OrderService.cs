using DesafioMt.Application.Common.Abstractions;
using DesafioMt.Application.Orders.Dtos;
using DesafioMt.Domain.Common;
using DesafioMt.Domain.Entities;
using FluentValidation;

namespace DesafioMt.Application.Orders;

public interface IOrderService
{
    Task<OrderDto> CreateAsync(CreateOrderDto dto, CancellationToken ct = default);
    Task<OrderDto> UpdateAsync(Guid id, UpdateOrderDto dto, CancellationToken ct = default);
    Task<OrderDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<(IReadOnlyList<OrderDto> Items, int Total, decimal TotalSum)> SearchAsync(Guid? customerId, string? customerName, DateTime? from, DateTime? to, int page, int pageSize, CancellationToken ct = default);
}

public class OrderService : IOrderService
{
    private readonly IOrderRepository _orders;
    private readonly ICustomerRepository _customers;
    private readonly IProductRepository _products;
    private readonly IValidator<CreateOrderDto> _createValidator;
    private readonly IValidator<UpdateOrderDto> _updateValidator;

    public OrderService(
        IOrderRepository orders,
        ICustomerRepository customers,
        IProductRepository products,
        IValidator<CreateOrderDto> createValidator,
        IValidator<UpdateOrderDto> updateValidator)
    {
        _orders = orders;
        _customers = customers;
        _products = products;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
    }

    public async Task<OrderDto> CreateAsync(CreateOrderDto dto, CancellationToken ct = default)
    {
        await _createValidator.ValidateAndThrowAsync(dto, ct);

        // Otimizacao: removida a pre-checagem de existencia do cliente. A FK
        // orders.customer_id REFERENCES customers(id) garante a integridade no
        // banco - se o cliente nao existir, o INSERT falha e o repository
        // traduz em DomainNotFoundException. Economiza 1 round-trip cross-region.
        var items = await BuildItemsAsync(dto.Items, ct);
        var order = new Order(dto.CustomerId, dto.OrderDate, items);

        await _orders.AddAsync(order, ct);

        // Removido o re-fetch do pedido apos AddAsync: o frontend navega para a
        // lista logo apos receber o 201, entao nao precisa de CustomerName na
        // resposta. Economiza mais um round-trip - critico em latencia alta.
        return MapToDto(order);
    }

    public async Task<OrderDto> UpdateAsync(Guid id, UpdateOrderDto dto, CancellationToken ct = default)
    {
        await _updateValidator.ValidateAndThrowAsync(dto, ct);

        // Aqui o GetByIdAsync e necessario para o Order.Update() poder checar
        // a regra das 24h sobre o CreatedAt original do pedido.
        var order = await _orders.GetByIdAsync(id, ct)
            ?? throw new DomainNotFoundException("Pedido não encontrado.");

        var newItems = await BuildItemsAsync(dto.Items, ct);
        order.Update(dto.OrderDate, newItems);

        await _orders.UpdateAsync(order, ct);

        // Sem re-fetch: usuario sera navegado para a lista, onde a busca refresca.
        return MapToDto(order);
    }

    public async Task<OrderDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var order = await _orders.GetByIdAsync(id, ct);
        return order is null ? null : MapToDto(order);
    }

    public async Task<(IReadOnlyList<OrderDto> Items, int Total, decimal TotalSum)> SearchAsync(
        Guid? customerId, string? customerName, DateTime? from, DateTime? to, int page, int pageSize, CancellationToken ct = default)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;
        if (pageSize > 200) pageSize = 200;

        var (fromUtc, toUtc) = ToBrtRangeUtc(from, to);
        var (items, total, totalSum) = await _orders.SearchAsync(customerId, customerName, fromUtc, toUtc, page, pageSize, ct);
        return (items.Select(MapToListDto).ToList(), total, totalSum);
    }

    /// <summary>
    /// Converte um par de datas (interpretadas como dias-calendário de Brasília, UTC-3) em um range UTC
    /// [fromUtc, toUtc) — fim exclusivo, o que garante que o dia inteiro do "Até" entre no filtro.
    /// </summary>
    private static (DateTime? FromUtc, DateTime? ToUtc) ToBrtRangeUtc(DateTime? from, DateTime? to)
    {
        var brt = TimeSpan.FromHours(-3);
        DateTime? fromUtc = from.HasValue
            ? new DateTimeOffset(from.Value.Year, from.Value.Month, from.Value.Day, 0, 0, 0, brt).UtcDateTime
            : null;
        DateTime? toUtc = to.HasValue
            ? new DateTimeOffset(to.Value.Year, to.Value.Month, to.Value.Day, 0, 0, 0, brt).UtcDateTime.AddDays(1)
            : null;
        return (fromUtc, toUtc);
    }

    // Sempre que vier productId, o servidor sobrescreve nome e preco de tabela com o do catalogo.
    // Isto impede um cliente HTTP de fabricar nome ou unit_price diferente do que esta na tabela "produtos".
    // O sold_price (preco efetivamente cobrado) continua vindo do cliente, porque pode ter desconto.
    private async Task<List<OrderItem>> BuildItemsAsync(List<CreateOrderItemDto> itemsDto, CancellationToken ct)
    {
        // Coleta IDs unicos de produtos referenciados pelos itens.
        var productIds = itemsDto
            .Where(i => i.ProductId.HasValue && i.ProductId.Value != Guid.Empty)
            .Select(i => i.ProductId!.Value)
            .Distinct()
            .ToList();

        // Otimizacao: UM unico round-trip via GetByIdsAsync (WHERE id IN ...).
        // Antes faziamos N round-trips (um por id), que em latencia cross-region
        // (~180ms cada) podia somar segundos. Critico para o cenario do POST cair
        // antes da resposta voltar.
        var products = productIds.Count > 0
            ? await _products.GetByIdsAsync(productIds, ct)
            : Array.Empty<Product>();
        var productsById = products.ToDictionary(p => p.Id);

        // Se algum productId enviado nao existe no catalogo, falha amigavelmente.
        var missingId = productIds.FirstOrDefault(id => !productsById.ContainsKey(id));
        if (missingId != Guid.Empty)
            throw new DomainNotFoundException($"Produto não encontrado (id: {missingId}).");

        var result = new List<OrderItem>(itemsDto.Count);
        foreach (var dto in itemsDto)
        {
            string productName = dto.ProductName;
            decimal unitPrice = dto.UnitPrice;

            if (dto.ProductId.HasValue && dto.ProductId.Value != Guid.Empty &&
                productsById.TryGetValue(dto.ProductId.Value, out var product))
            {
                productName = product.Name;       // snapshot do catalogo
                unitPrice = product.UnitPrice;    // garante que o cliente nao falsifica o preco de tabela
            }

            var sold = dto.SoldPrice > 0 ? dto.SoldPrice : unitPrice;
            result.Add(new OrderItem(dto.ProductId, productName, dto.Quantity, unitPrice, sold));
        }
        return result;
    }

    private static OrderDto MapToDto(Order o) => new()
    {
        Id = o.Id,
        CustomerId = o.CustomerId,
        CustomerName = o.Customer?.Name,
        OrderDate = o.OrderDate,
        TotalValue = o.TotalValue,
        Items = o.Items.Select(i => new OrderItemDto
        {
            Id = i.Id,
            ProductId = i.ProductId,
            ProductName = i.ProductName,
            Quantity = i.Quantity,
            UnitPrice = i.UnitPrice,
            SoldPrice = i.SoldPrice,
            Subtotal = i.Subtotal
        }).ToList(),
        ItemCount = o.Items.Count,
        CreatedAt = o.CreatedAt,
        UpdatedAt = o.UpdatedAt,
        CanBeModified = o.CanBeModified()
    };

    private static OrderDto MapToListDto(OrderListItem o) => new()
    {
        Id = o.Id,
        CustomerId = o.CustomerId,
        CustomerName = o.CustomerName,
        OrderDate = o.OrderDate,
        TotalValue = o.TotalValue,
        Items = new(),
        ItemCount = o.ItemCount,
        CreatedAt = o.CreatedAt,
        UpdatedAt = o.UpdatedAt,
        CanBeModified = (DateTime.UtcNow - o.CreatedAt) <= Order.ModificationWindow
    };
}
