namespace DesafioMt.Application.Orders.Dtos;

public class OrderDto
{
    public Guid Id { get; set; }
    public Guid CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public DateTime OrderDate { get; set; }
    public decimal TotalValue { get; set; }
    public List<OrderItemDto> Items { get; set; } = new();
    public int ItemCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public bool CanBeModified { get; set; }
}

public class CreateOrderDto
{
    public Guid CustomerId { get; set; }
    public DateTime OrderDate { get; set; }
    public List<CreateOrderItemDto> Items { get; set; } = new();
}

public class UpdateOrderDto
{
    public DateTime OrderDate { get; set; }
    public List<CreateOrderItemDto> Items { get; set; } = new();
}
