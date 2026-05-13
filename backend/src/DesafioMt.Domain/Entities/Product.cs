using DesafioMt.Domain.Common;

namespace DesafioMt.Domain.Entities;

public class Product
{
    public Guid Id { get; private set; }
    public string Name { get; private set; } = null!;
    public decimal UnitPrice { get; private set; }

    private Product() { }

    public Product(string name, decimal unitPrice)
    {
        Id = Guid.NewGuid();
        SetName(name);
        SetUnitPrice(unitPrice);
    }

    private void SetName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainException("Nome do produto é obrigatório.");
        if (name.Length > 200)
            throw new DomainException("Nome do produto deve ter no máximo 200 caracteres.");
        Name = name.Trim();
    }

    private void SetUnitPrice(decimal unitPrice)
    {
        if (unitPrice < 0) throw new DomainException("Preço unitário não pode ser negativo.");
        UnitPrice = unitPrice;
    }
}
