using DesafioMt.Domain.Common;
using DesafioMt.Domain.ValueObjects;
using FluentAssertions;

namespace DesafioMt.Tests.Domain;

public class CpfTests
{
    [Theory]
    [InlineData("11144477735")]
    [InlineData("111.444.777-35")]
    [InlineData("529.982.247-25")]
    [InlineData("52998224725")]
    public void Cria_cpf_valido(string input)
    {
        var cpf = new Cpf(input);
        cpf.Value.Should().HaveLength(11);
        cpf.Value.Should().MatchRegex(@"^\d{11}$");
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    [InlineData("   ")]
    public void Rejeita_cpf_vazio(string? input)
    {
        var act = () => new Cpf(input!);
        act.Should().Throw<DomainException>().WithMessage("*obrigatório*");
    }

    [Theory]
    [InlineData("123")]
    [InlineData("123456789")]
    [InlineData("123456789012")]
    public void Rejeita_cpf_com_quantidade_de_digitos_errada(string input)
    {
        var act = () => new Cpf(input);
        act.Should().Throw<DomainException>().WithMessage("*11 dígitos*");
    }

    [Theory]
    [InlineData("00000000000")]
    [InlineData("11111111111")]
    [InlineData("99999999999")]
    public void Rejeita_cpf_com_todos_digitos_iguais(string input)
    {
        var act = () => new Cpf(input);
        act.Should().Throw<DomainException>().WithMessage("*inválido*");
    }

    [Theory]
    [InlineData("12345678901")]
    [InlineData("11144477734")]
    [InlineData("52998224724")]
    public void Rejeita_cpf_com_checksum_invalido(string input)
    {
        var act = () => new Cpf(input);
        act.Should().Throw<DomainException>().WithMessage("*inválido*");
    }

    [Fact]
    public void Formata_cpf_corretamente()
    {
        var cpf = new Cpf("11144477735");
        cpf.Formatted.Should().Be("111.444.777-35");
    }
}
