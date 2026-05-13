using DesafioMt.Application.Customers;
using DesafioMt.Application.Customers.Dtos;
using Microsoft.AspNetCore.Mvc;

namespace DesafioMt.Api.Controllers;

[ApiController]
[Route("api/customers")]
[Produces("application/json")]
public class CustomersController : ControllerBase
{
    private readonly ICustomerService _service;

    public CustomersController(ICustomerService service)
    {
        _service = service;
    }

    /// <summary>Lista clientes com filtro opcional por nome e paginação.</summary>
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? name,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var (items, total) = await _service.SearchAsync(name, page, pageSize, ct);
        return Ok(new
        {
            page,
            pageSize,
            total,
            items
        });
    }

    /// <summary>Detalhe de um cliente.</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var dto = await _service.GetByIdAsync(id, ct);
        return dto is null ? NotFound() : Ok(dto);
    }

    /// <summary>Cria um novo cliente.</summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCustomerDto dto, CancellationToken ct)
    {
        var created = await _service.CreateAsync(dto, ct);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
    }

    /// <summary>Atualiza um cliente existente.</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateCustomerDto dto, CancellationToken ct)
    {
        var updated = await _service.UpdateAsync(id, dto, ct);
        return Ok(updated);
    }

    /// <summary>Remove um cliente.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _service.DeleteAsync(id, ct);
        return NoContent();
    }

    /// <summary>Total gasto pelo cliente em pedidos.</summary>
    [HttpGet("{id:guid}/total-spent")]
    public async Task<IActionResult> GetTotalSpent(Guid id, CancellationToken ct)
    {
        var total = await _service.GetTotalSpentAsync(id, ct);
        return Ok(new { customerId = id, totalSpent = total });
    }
}
