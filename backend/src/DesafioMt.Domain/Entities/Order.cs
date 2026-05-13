using DesafioMt.Domain.Common;

namespace DesafioMt.Domain.Entities;

// Aggregate root de pedido. Concentra duas regras de negocio criticas:
//   1) Total recalculado pelo dominio (nunca aceito do cliente)
//   2) Janela de 24h para edicao a partir do CreatedAt
// Como sao invariantes, ficam aqui e nao no servico - assim sao impossiveis de
// burlar mesmo que apareca um caso de uso ou caller novo.
public class Order
{
    public static readonly TimeSpan ModificationWindow = TimeSpan.FromHours(24);

    // Lista interna mutavel; expomos so como IReadOnlyCollection.
    private readonly List<OrderItem> _items = new();

    public Guid Id { get; private set; }
    public Guid CustomerId { get; private set; }
    public Customer? Customer { get; private set; }
    public DateTime OrderDate { get; private set; }
    public decimal TotalValue { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    public IReadOnlyCollection<OrderItem> Items => _items.AsReadOnly();

    private Order() { }

    public Order(Guid customerId, DateTime orderDate, IEnumerable<OrderItem> items)
    {
        if (customerId == Guid.Empty)
            throw new DomainException("Cliente é obrigatório.");

        var itemList = (items ?? Enumerable.Empty<OrderItem>()).ToList();
        if (itemList.Count == 0)
            throw new DomainException("Pedido deve conter pelo menos um item.");

        Id = Guid.NewGuid();
        CustomerId = customerId;
        OrderDate = NormalizeToUtc(orderDate);
        CreatedAt = DateTime.UtcNow;
        UpdatedAt = CreatedAt;

        foreach (var item in itemList)
        {
            item.AttachToOrder(Id);
            _items.Add(item);
        }
        RecalculateTotal();
    }

    /// <summary>
    /// Diz se o pedido ainda pode ser editado (dentro da janela de 24h do CreatedAt).
    /// Parametro <paramref name="now"/> existe para facilitar testes determinísticos.
    /// </summary>
    public bool CanBeModified(DateTime? now = null) =>
        ((now ?? DateTime.UtcNow) - CreatedAt) <= ModificationWindow;

    public void Update(DateTime orderDate, IEnumerable<OrderItem> items, DateTime? now = null)
    {
        // Regra de negocio das 24h - lanca DomainConflictException para que o middleware
        // traduza em HTTP 409. Importante manter aqui (no dominio) e nao no service:
        // qualquer caminho que chame Update vai esbarrar nesta checagem.
        if (!CanBeModified(now))
            throw new DomainConflictException("Pedido não pode ser alterado após 24 horas de sua criação.");

        var itemList = (items ?? Enumerable.Empty<OrderItem>()).ToList();
        if (itemList.Count == 0)
            throw new DomainException("Pedido deve conter pelo menos um item.");

        OrderDate = orderDate == default ? OrderDate : NormalizeToUtc(orderDate);
        _items.Clear();
        foreach (var item in itemList)
        {
            item.AttachToOrder(Id);
            _items.Add(item);
        }
        RecalculateTotal();
        UpdatedAt = DateTime.UtcNow;
    }

    // total_value sempre derivado dos itens - nunca aceito do cliente HTTP.
    // O CHECK constraint no banco (subtotal = quantity * sold_price) garante
    // que tampouco e possivel fabricar subtotais por fora do dominio.
    private void RecalculateTotal() =>
        TotalValue = decimal.Round(_items.Sum(i => i.Subtotal), 2);

    // Postgres timestamptz exige Kind=Utc no Npgsql. O front manda ISO 8601 em UTC,
    // mas se vier algum DateTime sem Kind ou em Local, normalizamos antes de persistir.
    private static DateTime NormalizeToUtc(DateTime dt)
    {
        if (dt == default) return DateTime.UtcNow;
        return dt.Kind switch
        {
            DateTimeKind.Utc => dt,
            DateTimeKind.Local => dt.ToUniversalTime(),
            _ => DateTime.SpecifyKind(dt, DateTimeKind.Utc)
        };
    }
}
