namespace DesafioMt.Application.Orders.Dtos;

public class OrderItemDto
{
    public Guid Id { get; set; }
    public Guid? ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    /// <summary>Preço de tabela (catálogo) no momento da venda.</summary>
    public decimal UnitPrice { get; set; }
    /// <summary>Preço efetivamente cobrado por unidade.</summary>
    public decimal SoldPrice { get; set; }
    public decimal Subtotal { get; set; }
}

public class CreateOrderItemDto
{
    public Guid? ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal SoldPrice { get; set; }
}
