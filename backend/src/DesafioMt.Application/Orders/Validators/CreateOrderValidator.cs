using DesafioMt.Application.Orders.Dtos;
using FluentValidation;

namespace DesafioMt.Application.Orders.Validators;

public class CreateOrderItemValidator : AbstractValidator<CreateOrderItemDto>
{
    public CreateOrderItemValidator()
    {
        RuleFor(x => x.ProductName)
            .NotEmpty().WithMessage("Nome do produto é obrigatório.")
            .MaximumLength(200).WithMessage("Nome do produto deve ter no máximo 200 caracteres.");
        RuleFor(x => x.Quantity)
            .GreaterThan(0).WithMessage("Quantidade deve ser maior que zero.");
        RuleFor(x => x.UnitPrice)
            .GreaterThanOrEqualTo(0).WithMessage("Preço de tabela não pode ser negativo.");
        RuleFor(x => x.SoldPrice)
            .GreaterThanOrEqualTo(0).WithMessage("Preço de venda não pode ser negativo.");
    }
}

public class CreateOrderValidator : AbstractValidator<CreateOrderDto>
{
    public CreateOrderValidator()
    {
        RuleFor(x => x.CustomerId)
            .NotEmpty().WithMessage("Cliente é obrigatório.");

        RuleFor(x => x.Items)
            .NotNull().Must(items => items != null && items.Count > 0)
            .WithMessage("Pedido deve conter pelo menos um item.");

        RuleForEach(x => x.Items).SetValidator(new CreateOrderItemValidator());
    }
}

public class UpdateOrderValidator : AbstractValidator<UpdateOrderDto>
{
    public UpdateOrderValidator()
    {
        RuleFor(x => x.Items)
            .NotNull().Must(items => items != null && items.Count > 0)
            .WithMessage("Pedido deve conter pelo menos um item.");

        RuleForEach(x => x.Items).SetValidator(new CreateOrderItemValidator());
    }
}
