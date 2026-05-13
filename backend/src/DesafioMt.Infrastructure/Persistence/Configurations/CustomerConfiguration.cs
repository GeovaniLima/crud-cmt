using DesafioMt.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DesafioMt.Infrastructure.Persistence.Configurations;

public class CustomerConfiguration : IEntityTypeConfiguration<Customer>
{
    public void Configure(EntityTypeBuilder<Customer> builder)
    {
        builder.ToTable("customers");

        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasColumnName("id");

        builder.Property(c => c.Name)
            .HasColumnName("name")
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(c => c.Email)
            .HasColumnName("email")
            .HasMaxLength(255)
            .IsRequired();

        builder.HasIndex(c => c.Email).IsUnique();

        builder.Property(c => c.BirthDate)
            .HasColumnName("birth_date")
            .IsRequired();

        builder.Property(c => c.Cpf)
            .HasColumnName("cpf")
            .HasMaxLength(11)
            .IsRequired();

        builder.HasIndex(c => c.Cpf).IsUnique();

        builder.Ignore(c => c.CpfFormatted);

        builder.OwnsOne(c => c.Address, address =>
        {
            address.Property(a => a.Street).HasColumnName("address_street").HasMaxLength(200).IsRequired();
            address.Property(a => a.Number).HasColumnName("address_number").HasMaxLength(20).IsRequired();
            address.Property(a => a.Complement).HasColumnName("address_complement").HasMaxLength(100);
            address.Property(a => a.Neighborhood).HasColumnName("address_neighborhood").HasMaxLength(100).IsRequired();
            address.Property(a => a.City).HasColumnName("address_city").HasMaxLength(100).IsRequired();
            address.Property(a => a.State).HasColumnName("address_state").HasMaxLength(2).IsFixedLength().IsRequired();
            address.Property(a => a.ZipCode).HasColumnName("address_zip_code").HasMaxLength(9).IsRequired();
        });

        builder.Property(c => c.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(c => c.UpdatedAt).HasColumnName("updated_at").IsRequired();
    }
}
