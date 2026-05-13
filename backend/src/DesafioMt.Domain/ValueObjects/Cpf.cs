using System.Text.RegularExpressions;
using DesafioMt.Domain.Common;

namespace DesafioMt.Domain.ValueObjects;

// Value Object de CPF. Construir uma instancia ja valida formato e checksum -
// se o objeto existe, o CPF e valido. O banco guarda so digitos (11 caracteres),
// e o front recebe formatado pela propriedade Formatted / metodo estatico Format.
//
// Nao mapeamos como Value Object persistido no EF: a entidade Customer guarda
// o CPF como string e usa o Cpf VO apenas como validador no boundary
// (CustomerService -> new Cpf(dto.Cpf)). Isso evita o problema de tradução
// LINQ quando filtramos por CPF em queries (c.Cpf == "..." vira SQL direto).
public sealed record Cpf
{
    private static readonly Regex NonDigits = new(@"\D", RegexOptions.Compiled);

    public string Value { get; }

    public Cpf(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new DomainException("CPF é obrigatório.");

        // Remove pontos, hifens e espacos antes de validar - aceita "111.444.777-35"
        // e "11144477735" indistintamente.
        var digits = NonDigits.Replace(value, string.Empty);

        if (digits.Length != 11)
            throw new DomainException("CPF deve conter 11 dígitos.");

        // CPFs com todos digitos iguais (000.000.000-00, 111..., etc) passam no checksum
        // mas sao considerados invalidos pela Receita Federal. Rejeitamos manualmente.
        if (HasAllSameDigits(digits))
            throw new DomainException("CPF inválido.");

        if (!IsValidChecksum(digits))
            throw new DomainException("CPF inválido.");

        Value = digits;
    }

    public string Formatted => Format(Value);

    public override string ToString() => Value;

    // Exposto como estatico para que Customer.CpfFormatted (propriedade calculada
    // a partir da string crua) possa reutilizar sem instanciar o VO.
    public static string Format(string digits) =>
        digits.Length == 11 ? $"{digits[..3]}.{digits[3..6]}.{digits[6..9]}-{digits[9..]}" : digits;

    private static bool HasAllSameDigits(string digits) =>
        digits.Distinct().Count() == 1;

    // Algoritmo oficial: dois digitos verificadores calculados por somas ponderadas
    // mod 11. Se o resto for < 2 o digito e 0; senao e 11 - resto.
    private static bool IsValidChecksum(string digits)
    {
        // Primeiro digito verificador: pesos 10..2 sobre os 9 primeiros digitos.
        var firstCheck = CalculateDigit(digits, 9, 10);
        if (firstCheck != (digits[9] - '0')) return false;

        // Segundo digito verificador: pesos 11..2 sobre os 10 primeiros digitos
        // (ja incluindo o primeiro verificador).
        var secondCheck = CalculateDigit(digits, 10, 11);
        return secondCheck == (digits[10] - '0');
    }

    private static int CalculateDigit(string digits, int length, int startWeight)
    {
        var sum = 0;
        for (var i = 0; i < length; i++)
            sum += (digits[i] - '0') * (startWeight - i);

        var remainder = sum % 11;
        return remainder < 2 ? 0 : 11 - remainder;
    }
}
