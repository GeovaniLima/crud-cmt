using DesafioMt.Domain.Common;
using DesafioMt.Domain.Entities;
using DesafioMt.Domain.ValueObjects;
using FluentAssertions;

namespace DesafioMt.Tests.Domain;

public class CustomerTests
{
    private static Address ValidAddress() =>
        new("Rua A", "100", null, "Centro", "Cuiabá", "MT", "78005-000");

    private static Cpf ValidCpf() => new("111.444.777-35");

    private static DateOnly AgeYearsAgo(int years) =>
        DateOnly.FromDateTime(DateTime.UtcNow).AddYears(-years);

    [Fact]
    public void Cria_cliente_com_dados_validos()
    {
        var c = new Customer("Geovani", "geo@example.com", AgeYearsAgo(25), ValidCpf(), ValidAddress());

        c.Id.Should().NotBe(Guid.Empty);
        c.Name.Should().Be("Geovani");
        c.Email.Should().Be("geo@example.com");
        c.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(2));
        c.UpdatedAt.Should().Be(c.CreatedAt);
    }

    [Fact]
    public void Rejeita_idade_menor_que_18()
    {
        var act = () => new Customer("Joao", "j@x.com", AgeYearsAgo(17), ValidCpf(), ValidAddress());
        act.Should().Throw<DomainException>().WithMessage("*18 anos*");
    }

    [Fact]
    public void Aceita_idade_exatamente_18()
    {
        var birth = DateOnly.FromDateTime(DateTime.UtcNow).AddYears(-18);
        var act = () => new Customer("Maria", "m@x.com", birth, ValidCpf(), ValidAddress());
        act.Should().NotThrow();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public void Rejeita_nome_vazio(string? name)
    {
        var act = () => new Customer(name!, "j@x.com", AgeYearsAgo(25), ValidCpf(), ValidAddress());
        act.Should().Throw<DomainException>().WithMessage("*Nome*");
    }

    [Theory]
    [InlineData("emailsemarroba")]
    [InlineData("@semuser.com")]
    [InlineData("sem@dominio")]
    [InlineData("")]
    public void Rejeita_email_invalido(string email)
    {
        var act = () => new Customer("Joao", email, AgeYearsAgo(25), ValidCpf(), ValidAddress());
        act.Should().Throw<DomainException>().WithMessage("*mail*");
    }

    [Fact]
    public void Update_atualiza_dados_e_updatedAt()
    {
        var c = new Customer("Geovani", "geo@example.com", AgeYearsAgo(25), ValidCpf(), ValidAddress());
        var originalUpdatedAt = c.UpdatedAt;

        Thread.Sleep(20);
        c.Update("Geovani Lima", "geo2@example.com", AgeYearsAgo(26), ValidCpf(), ValidAddress());

        c.Name.Should().Be("Geovani Lima");
        c.Email.Should().Be("geo2@example.com");
        c.UpdatedAt.Should().BeAfter(originalUpdatedAt);
    }
}
