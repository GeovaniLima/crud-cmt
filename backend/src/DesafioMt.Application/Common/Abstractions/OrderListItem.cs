namespace DesafioMt.Application.Common.Abstractions;

/// <summary>Projeção achatada de Order para listagens — evita hidratar OrderItems.</summary>
public record OrderListItem(
    Guid Id,
    Guid CustomerId,
    string? CustomerName,
    DateTime OrderDate,
    decimal TotalValue,
    int ItemCount,
    DateTime CreatedAt,
    DateTime UpdatedAt);
