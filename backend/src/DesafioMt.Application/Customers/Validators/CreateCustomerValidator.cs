using DesafioMt.Application.Customers.Dtos;
using FluentValidation;

namespace DesafioMt.Application.Customers.Validators;

public class CreateCustomerValidator : AbstractValidator<CreateCustomerDto>
{
    public CreateCustomerValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Nome é obrigatório.")
            .MaximumLength(200).WithMessage("Nome deve ter no máximo 200 caracteres.");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("E-mail é obrigatório.")
            .EmailAddress().WithMessage("E-mail inválido.")
            .MaximumLength(255).WithMessage("E-mail deve ter no máximo 255 caracteres.");

        RuleFor(x => x.BirthDate)
            .NotEmpty().WithMessage("Data de nascimento é obrigatória.")
            .Must(birthDate => birthDate < DateOnly.FromDateTime(DateTime.UtcNow))
            .WithMessage("Data de nascimento deve ser anterior à data atual.");

        RuleFor(x => x.Cpf)
            .NotEmpty().WithMessage("CPF é obrigatório.");

        RuleFor(x => x.Address).NotNull().WithMessage("Endereço é obrigatório.");

        When(x => x.Address != null, () =>
        {
            RuleFor(x => x.Address.Street).NotEmpty().WithMessage("Rua é obrigatória.");
            RuleFor(x => x.Address.Number).NotEmpty().WithMessage("Número é obrigatório.");
            RuleFor(x => x.Address.Neighborhood).NotEmpty().WithMessage("Bairro é obrigatório.");
            RuleFor(x => x.Address.City).NotEmpty().WithMessage("Cidade é obrigatória.");
            RuleFor(x => x.Address.State).NotEmpty().Length(2).WithMessage("UF deve ter 2 letras.");
            RuleFor(x => x.Address.ZipCode).NotEmpty().WithMessage("CEP é obrigatório.");
        });
    }
}

public class UpdateCustomerValidator : AbstractValidator<UpdateCustomerDto>
{
    public UpdateCustomerValidator()
    {
        Include(new CreateCustomerValidator());
    }
}
