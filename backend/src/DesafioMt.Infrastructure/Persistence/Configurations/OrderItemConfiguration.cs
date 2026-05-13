using DesafioMt.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DesafioMt.Infrastructure.Persistence.Configurations;

public class OrderItemConfiguration : IEntityTypeConfiguration<OrderItem>
{
    public void Configure(EntityTypeBuilder<OrderItem> builder)
    {
        builder.ToTable("order_items");

        builder.HasKey(i => i.Id);
        builder.Property(i => i.Id).HasColumnName("id");
        builder.Property(i => i.OrderId).HasColumnName("order_id").IsRequired();
        builder.Property(i => i.ProductId).HasColumnName("product_id");
        builder.HasOne<Product>().WithMany().HasForeignKey(i => i.ProductId).OnDelete(DeleteBehavior.Restrict);
        builder.Property(i => i.ProductName).HasColumnName("product_name").HasMaxLength(200).IsRequired();
        builder.Property(i => i.Quantity).HasColumnName("quantity").IsRequired();
        builder.Property(i => i.UnitPrice).HasColumnName("unit_price").HasColumnType("decimal(15,2)").IsRequired();
        builder.Property(i => i.SoldPrice).HasColumnName("sold_price").HasColumnType("decimal(15,2)").IsRequired();
        builder.Property(i => i.Subtotal).HasColumnName("subtotal").HasColumnType("decimal(15,2)").IsRequired();
        builder.Property(i => i.CreatedAt).HasColumnName("created_at").IsRequired();
    }
}
