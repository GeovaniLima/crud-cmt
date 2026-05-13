namespace DesafioMt.Application.Customers.Dtos;

public class CreateCustomerDto
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public DateOnly BirthDate { get; set; }
    public string Cpf { get; set; } = string.Empty;
    public AddressDto Address { get; set; } = new();
}

public class UpdateCustomerDto : CreateCustomerDto
{
}
