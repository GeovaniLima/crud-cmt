using DesafioMt.Domain.Common;

namespace DesafioMt.Domain.Entities;

// Entidade filha do agregado Order. Nao tem identidade propria fora do pedido -
// quem manipula a colecao e o aggregate root (Order.Update reconstroi todos os itens).
// Guarda dois pre os por razoes historicas:
//   - UnitPrice: snapshot do produto na hora da venda (catalogo)
//   - SoldPrice: o que de fato foi cobrado (com desconto/acrescimo se houve)
// O ProductId e opcional para suportar itens historicos que nao referenciam o catalogo.
public class OrderItem
{
    public Guid Id { get; private set; }
    public Guid OrderId { get; private set; }
    public Guid? ProductId { get; private set; }
    public string ProductName { get; private set; } = null!;
    public int Quantity { get; private set; }
    /// <summary>Preço de tabela (catálogo) no momento da venda — referência histórica.</summary>
    public decimal UnitPrice { get; private set; }
    /// <summary>Preço efetivamente cobrado por unidade (pode diferir do UnitPrice por desconto/acréscimo).</summary>
    public decimal SoldPrice { get; private set; }
    public decimal Subtotal { get; private set; }
    public DateTime CreatedAt { get; private set; }

    private OrderItem() { }

    public OrderItem(Guid? productId, string productName, int quantity, decimal unitPrice, decimal soldPrice)
    {
        if (string.IsNullOrWhiteSpace(productName))
            throw new DomainException("Nome do produto é obrigatório.");
        if (productName.Length > 200)
            throw new DomainException("Nome do produto deve ter no máximo 200 caracteres.");
        if (quantity <= 0)
            throw new DomainException("Quantidade deve ser maior que zero.");
        if (unitPrice < 0)
            throw new DomainException("Preço de tabela não pode ser negativo.");
        if (soldPrice < 0)
            throw new DomainException("Preço de venda não pode ser negativo.");

        Id = Guid.NewGuid();
        // Guid.Empty nao e FK valida - normalizamos para null para o EF aceitar.
        ProductId = productId == Guid.Empty ? null : productId;
        ProductName = productName.Trim();
        Quantity = quantity;
        UnitPrice = decimal.Round(unitPrice, 2);
        SoldPrice = decimal.Round(soldPrice, 2);
        // Subtotal sempre calculado pelo dominio - bate com o CHECK do banco
        // (order_items_subtotal_match: subtotal = quantity * sold_price).
        Subtotal = decimal.Round(quantity * SoldPrice, 2);
        CreatedAt = DateTime.UtcNow;
    }

    // Setado pelo aggregate root (Order) ao adicionar este item.
    // E internal para impedir que callers fora do dominio mexam no parent id.
    internal void AttachToOrder(Guid orderId) => OrderId = orderId;
}
