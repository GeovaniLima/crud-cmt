using DesafioMt.Application.Products;
using Microsoft.AspNetCore.Mvc;

namespace DesafioMt.Api.Controllers;

[ApiController]
[Route("api/products")]
[Produces("application/json")]
public class ProductsController : ControllerBase
{
    private readonly IProductService _service;

    public ProductsController(IProductService service)
    {
        _service = service;
    }

    /// <summary>Lista produtos do catálogo (com filtro opcional por nome).</summary>
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? name, CancellationToken ct)
    {
        var items = await _service.ListAsync(name, ct);
        return Ok(items);
    }
}
