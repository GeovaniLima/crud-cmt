using DesafioMt.Domain.Common;
using DesafioMt.Domain.Entities;
using FluentAssertions;

namespace DesafioMt.Tests.Domain;

public class OrderTests
{
    private static OrderItem Item(string name = "Produto", int qty = 1, decimal price = 10m) =>
        new(null, name, qty, price, price);

    [Fact]
    public void Cria_pedido_valido_com_total_calculado()
    {
        var customerId = Guid.NewGuid();
        var items = new[]
        {
            Item("A", 2, 10m),    // 20.00
            Item("B", 1, 15.50m), // 15.50
            Item("C", 3, 7m)      // 21.00
        };

        var order = new Order(customerId, DateTime.UtcNow, items);

        order.Id.Should().NotBe(Guid.Empty);
        order.CustomerId.Should().Be(customerId);
        order.Items.Should().HaveCount(3);
        order.TotalValue.Should().Be(56.50m);
        order.Items.Should().OnlyContain(i => i.OrderId == order.Id);
    }

    [Fact]
    public void Rejeita_customer_id_vazio()
    {
        var act = () => new Order(Guid.Empty, DateTime.UtcNow, new[] { Item() });
        act.Should().Throw<DomainException>().WithMessage("*Cliente*");
    }

    [Fact]
    public void Rejeita_pedido_sem_itens()
    {
        var act = () => new Order(Guid.NewGuid(), DateTime.UtcNow, Array.Empty<OrderItem>());
        act.Should().Throw<DomainException>().WithMessage("*pelo menos um item*");
    }

    [Fact]
    public void Rejeita_pedido_com_itens_null()
    {
        var act = () => new Order(Guid.NewGuid(), DateTime.UtcNow, null!);
        act.Should().Throw<DomainException>().WithMessage("*pelo menos um item*");
    }

    [Fact]
    public void Permite_alterar_dentro_da_janela_de_24h()
    {
        var order = new Order(Guid.NewGuid(), DateTime.UtcNow, new[] { Item("A", 1, 10m) });

        var act = () => order.Update(DateTime.UtcNow, new[] { Item("B", 2, 20m) });

        act.Should().NotThrow();
        order.Items.Should().HaveCount(1);
        order.Items.Single().ProductName.Should().Be("B");
        order.TotalValue.Should().Be(40m);
    }

    [Fact]
    public void Bloqueia_alteracao_apos_24h()
    {
        var order = new Order(Guid.NewGuid(), DateTime.UtcNow.AddHours(-25), new[] { Item("A", 1, 10m) });
        // Simula que foi criado há 25h forçando o "agora" no Update
        var act = () => order.Update(DateTime.UtcNow, new[] { Item("B", 1, 20m) }, DateTime.UtcNow.AddHours(25));

        // O CreatedAt no construtor é UtcNow; portanto agora+25h > 24h da criação
        act.Should().Throw<DomainConflictException>().WithMessage("*24 horas*");
    }

    [Fact]
    public void CanBeModified_true_dentro_da_janela()
    {
        var order = new Order(Guid.NewGuid(), DateTime.UtcNow, new[] { Item() });
        order.CanBeModified().Should().BeTrue();
    }

    [Fact]
    public void CanBeModified_false_apos_24h()
    {
        var order = new Order(Guid.NewGuid(), DateTime.UtcNow, new[] { Item() });
        order.CanBeModified(DateTime.UtcNow.AddHours(25)).Should().BeFalse();
    }

    [Fact]
    public void Update_atualiza_updatedAt_e_recalcula_total()
    {
        var order = new Order(Guid.NewGuid(), DateTime.UtcNow, new[] { Item("A", 1, 10m) });
        var original = order.UpdatedAt;

        Thread.Sleep(20);
        order.Update(DateTime.UtcNow, new[] { Item("X", 5, 4m), Item("Y", 2, 3m) });

        order.UpdatedAt.Should().BeAfter(original);
        order.TotalValue.Should().Be(26m); // 5*4 + 2*3
    }

    [Fact]
    public void Update_rejeita_lista_vazia()
    {
        var order = new Order(Guid.NewGuid(), DateTime.UtcNow, new[] { Item() });
        var act = () => order.Update(DateTime.UtcNow, Array.Empty<OrderItem>());
        act.Should().Throw<DomainException>().WithMessage("*pelo menos um item*");
    }
}
