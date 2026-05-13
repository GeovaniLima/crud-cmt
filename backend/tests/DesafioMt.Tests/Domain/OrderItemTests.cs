using DesafioMt.Domain.Common;
using DesafioMt.Domain.Entities;
using FluentAssertions;

namespace DesafioMt.Tests.Domain;

public class OrderItemTests
{
    [Fact]
    public void Cria_item_valido_e_calcula_subtotal_pelo_sold_price()
    {
        var item = new OrderItem(null, "Mouse Logitech", 3, 89.90m, 89.90m);

        item.ProductName.Should().Be("Mouse Logitech");
        item.Quantity.Should().Be(3);
        item.UnitPrice.Should().Be(89.90m);
        item.SoldPrice.Should().Be(89.90m);
        item.Subtotal.Should().Be(269.70m);
    }

    [Fact]
    public void Subtotal_usa_sold_price_quando_diferente_do_unit_price()
    {
        // Vendido com desconto: unit_price 100, sold_price 80 (20% off)
        var item = new OrderItem(null, "Camiseta", 2, 100m, 80m);

        item.UnitPrice.Should().Be(100m);
        item.SoldPrice.Should().Be(80m);
        item.Subtotal.Should().Be(160m);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public void Rejeita_produto_sem_nome(string? name)
    {
        var act = () => new OrderItem(null, name!, 1, 10m, 10m);
        act.Should().Throw<DomainException>().WithMessage("*produto*");
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(-100)]
    public void Rejeita_quantidade_nao_positiva(int qty)
    {
        var act = () => new OrderItem(null, "Caneta", qty, 5m, 5m);
        act.Should().Throw<DomainException>().WithMessage("*Quantidade*");
    }

    [Fact]
    public void Rejeita_unit_price_negativo()
    {
        var act = () => new OrderItem(null, "Caneta", 1, -0.01m, 0m);
        act.Should().Throw<DomainException>().WithMessage("*tabela*");
    }

    [Fact]
    public void Rejeita_sold_price_negativo()
    {
        var act = () => new OrderItem(null, "Caneta", 1, 5m, -0.01m);
        act.Should().Throw<DomainException>().WithMessage("*venda*");
    }

    [Fact]
    public void Aceita_preco_zero()
    {
        var act = () => new OrderItem(null, "Brinde", 1, 0m, 0m);
        act.Should().NotThrow();
    }
}
