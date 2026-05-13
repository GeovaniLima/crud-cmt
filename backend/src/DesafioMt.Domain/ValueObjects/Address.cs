using System.Text.RegularExpressions;
using DesafioMt.Domain.Common;

namespace DesafioMt.Domain.ValueObjects;

public sealed record Address
{
    private static readonly Regex StateRegex = new(@"^[A-Z]{2}$", RegexOptions.Compiled);
    private static readonly Regex ZipRegex = new(@"^\d{5}-?\d{3}$", RegexOptions.Compiled);

    public string Street { get; }
    public string Number { get; }
    public string? Complement { get; }
    public string Neighborhood { get; }
    public string City { get; }
    public string State { get; }
    public string ZipCode { get; }

    public Address(string street, string number, string? complement, string neighborhood, string city, string state, string zipCode)
    {
        if (string.IsNullOrWhiteSpace(street)) throw new DomainException("Rua é obrigatória.");
        if (string.IsNullOrWhiteSpace(number)) throw new DomainException("Número é obrigatório.");
        if (string.IsNullOrWhiteSpace(neighborhood)) throw new DomainException("Bairro é obrigatório.");
        if (string.IsNullOrWhiteSpace(city)) throw new DomainException("Cidade é obrigatória.");

        var upperState = (state ?? string.Empty).Trim().ToUpperInvariant();
        if (!StateRegex.IsMatch(upperState))
            throw new DomainException("UF deve conter exatamente 2 letras.");

        if (string.IsNullOrWhiteSpace(zipCode) || !ZipRegex.IsMatch(zipCode))
            throw new DomainException("CEP inválido. Formato esperado: 12345-678 ou 12345678.");

        Street = street.Trim();
        Number = number.Trim();
        Complement = string.IsNullOrWhiteSpace(complement) ? null : complement.Trim();
        Neighborhood = neighborhood.Trim();
        City = city.Trim();
        State = upperState;
        ZipCode = new string(zipCode.Where(char.IsDigit).ToArray());
    }
}
