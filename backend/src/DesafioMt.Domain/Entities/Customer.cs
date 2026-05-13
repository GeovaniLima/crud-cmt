using System.Text.RegularExpressions;
using DesafioMt.Domain.Common;
using DesafioMt.Domain.ValueObjects;

namespace DesafioMt.Domain.Entities;

// Aggregate root de cliente. Toda regra invariante (nome obrigatorio,
// e-mail valido, idade >=18) e enforcada aqui no construtor / Update.
// CPF chega como Value Object validado, mas e persistido como string para
// evitar conversoes complexas nas queries LINQ do EF.
public class Customer
{
    private const int MinimumAge = 18;

    // Regex pragmatica: garante que ha um "@" e um "." no dominio.
    // Validacoes RFC 5322 completas sao caras e raramente uteis na pratica.
    private static readonly Regex EmailRegex = new(
        @"^[^@\s]+@[^@\s]+\.[^@\s]+$",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    public Guid Id { get; private set; }
    public string Name { get; private set; } = null!;
    public string Email { get; private set; } = null!;
    public DateOnly BirthDate { get; private set; }
    public string Cpf { get; private set; } = null!;
    public Address Address { get; private set; } = null!;
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    /// <summary>CPF formatado para apresentacao (000.000.000-00). Calculado, nao persistido.</summary>
    public string CpfFormatted => ValueObjects.Cpf.Format(Cpf);

    // Construtor parameterless privado para o EF Core rehidratar a entidade.
    private Customer() { }

    public Customer(string name, string email, DateOnly birthDate, Cpf cpf, Address address)
    {
        Id = Guid.NewGuid();
        SetName(name);
        SetEmail(email);
        SetBirthDate(birthDate);
        Cpf = (cpf ?? throw new DomainException("CPF é obrigatório.")).Value;
        Address = address ?? throw new DomainException("Endereço é obrigatório.");
        CreatedAt = DateTime.UtcNow;
        UpdatedAt = CreatedAt;
    }

    public void Update(string name, string email, DateOnly birthDate, Cpf cpf, Address address)
    {
        SetName(name);
        SetEmail(email);
        SetBirthDate(birthDate);
        Cpf = (cpf ?? throw new DomainException("CPF é obrigatório.")).Value;
        Address = address ?? throw new DomainException("Endereço é obrigatório.");
        UpdatedAt = DateTime.UtcNow;
    }

    private void SetName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainException("Nome é obrigatório.");
        if (name.Length > 200)
            throw new DomainException("Nome deve ter no máximo 200 caracteres.");
        Name = name.Trim();
    }

    private void SetEmail(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
            throw new DomainException("E-mail é obrigatório.");
        var trimmed = email.Trim();
        if (trimmed.Length > 255 || !EmailRegex.IsMatch(trimmed))
            throw new DomainException("E-mail inválido.");
        // Normaliza para minusculas - a constraint UNIQUE no banco compara como string,
        // entao "Maria@x.com" e "maria@x.com" precisam colidir.
        Email = trimmed.ToLowerInvariant();
    }

    private void SetBirthDate(DateOnly birthDate)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        if (birthDate >= today)
            throw new DomainException("Data de nascimento deve ser anterior à data atual.");

        // Calcula idade considerando dia/mes do aniversario - quem completa 18 anos hoje passa.
        var age = today.Year - birthDate.Year;
        if (birthDate > today.AddYears(-age)) age--;

        if (age < MinimumAge)
            throw new DomainException($"Cliente deve ter pelo menos {MinimumAge} anos.");

        BirthDate = birthDate;
    }
}
