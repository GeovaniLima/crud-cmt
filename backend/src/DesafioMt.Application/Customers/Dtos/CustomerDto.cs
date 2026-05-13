namespace DesafioMt.Application.Customers.Dtos;

public class CustomerDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public DateOnly BirthDate { get; set; }
    public int Age { get; set; }
    public string Cpf { get; set; } = string.Empty;
    public string CpfFormatted { get; set; } = string.Empty;
    public AddressDto Address { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
