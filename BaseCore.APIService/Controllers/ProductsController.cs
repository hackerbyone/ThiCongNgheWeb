using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using BaseCore.Entities;
using BaseCore.Repository.EFCore;

namespace BaseCore.APIService.Controllers
{
    /// <summary>
    /// Product API Controller
    /// Teaching: RESTful API, CRUD Operations, EF Core (Bài 10, 11)
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class ProductsController : ControllerBase
    {
        private readonly IProductRepository _productRepository;
        private readonly ICategoryRepository _categoryRepository;
        private readonly IOrderDetailRepository _orderDetailRepository;
        private readonly IManufacturerRepository _manufacturerRepository;
        private readonly BaseCore.Repository.AppDbContext _db;

        public ProductsController(
            IProductRepository productRepository,
            ICategoryRepository categoryRepository,
            IOrderDetailRepository orderDetailRepository,
            IManufacturerRepository manufacturerRepository,
            BaseCore.Repository.AppDbContext db)
        {
            _productRepository = productRepository;
            _categoryRepository = categoryRepository;
            _orderDetailRepository = orderDetailRepository;
            _manufacturerRepository = manufacturerRepository;
            _db = db;
        }

        private async Task<object> ToProductResponse(Product p)
        {
            var stats = await _db.ProductReviews
                .Where(r => r.ProductId == p.Id)
                .GroupBy(r => r.ProductId)
                .Select(g => new
                {
                    ReviewCount = g.Count(),
                    AverageRating = Math.Round(g.Average(r => r.Rating), 1)
                })
                .FirstOrDefaultAsync();

            return new
            {
                p.Id,
                p.Name,
                p.Price,
                p.Stock,
                p.ImageUrl,
                p.Description,
                p.CategoryId,
                p.DiscountPercent,
                p.ManufacturerId,
                p.Category,
                p.Manufacturer,
                averageRating = stats?.AverageRating ?? 0,
                reviewCount = stats?.ReviewCount ?? 0
            };
        }

        /// <summary>
        /// Get all products with pagination and search
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? keyword,
            [FromQuery] int? categoryId,
            [FromQuery] int? manufacturerId,
            [FromQuery] decimal? minPrice,
            [FromQuery] decimal? maxPrice,
            [FromQuery] string? brand,
            [FromQuery] bool discountOnly = false,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 12,
            [FromQuery] string? sortBy = null)
        {
            try
            {
                var (products, totalCount) = await _productRepository.SearchAsync(
                    keyword, categoryId, manufacturerId,
                    minPrice, maxPrice, brand,
                    discountOnly, page, pageSize, sortBy);

                var shapedProducts = new List<object>();
                foreach (var product in products)
                    shapedProducts.Add(await ToProductResponse(product));

                return Ok(new
                {
                    items = shapedProducts,
                    totalCount,
                    page,

                    pageSize,
                    totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi tải danh sách sản phẩm: " + ex.Message });
            }
        }

        /// <summary>
        /// Get product by ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var product = await _productRepository.GetByIdAsync(id);
                if (product == null)
                    return NotFound(new { message = "Product not found" });

                return Ok(await ToProductResponse(product));
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi tải sản phẩm: " + ex.Message });
            }
        }

        /// <summary>
        /// Create new product (requires authentication)
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Admin,Warehouse")]
        public async Task<IActionResult> Create([FromBody] ProductCreateDto dto)
        {
            var category = await _categoryRepository.GetByIdAsync(dto.CategoryId);
            if (category == null)
                return BadRequest(new { message = "Không tìm thấy danh mục" });

            if (dto.ManufacturerId.HasValue)
            {
                var mfr = await _manufacturerRepository.GetByIdAsync(dto.ManufacturerId.Value);
                if (mfr == null)
                    return BadRequest(new { message = "Không tìm thấy nhà sản xuất" });
            }

            var product = new Product
            {
                Name = dto.Name,
                Price = dto.Price,
                Stock = dto.Stock,
                CategoryId = dto.CategoryId,
                Description = dto.Description,
                ImageUrl = dto.ImageUrl ?? "",
                DiscountPercent = dto.DiscountPercent ?? 0,
                ManufacturerId = dto.ManufacturerId
            };

            await _productRepository.AddAsync(product);
            return CreatedAtAction(nameof(GetById), new { id = product.Id }, product);
        }

        /// <summary>
        /// Update product (requires authentication)
        /// </summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Warehouse")]
        public async Task<IActionResult> Update(int id, [FromBody] ProductUpdateDto dto)
        {
            var product = await _productRepository.GetByIdAsync(id);
            if (product == null)
                return NotFound(new { message = "Product not found" });

            if (dto.CategoryId.HasValue)
            {
                var category = await _categoryRepository.GetByIdAsync(dto.CategoryId.Value);
                if (category == null)
                    return BadRequest(new { message = "Không tìm thấy danh mục" });
                product.CategoryId = dto.CategoryId.Value;
            }

            if (dto.ManufacturerId.HasValue)
            {
                if (dto.ManufacturerId.Value == 0)
                {
                    product.ManufacturerId = null;
                }
                else
                {
                    var mfr = await _manufacturerRepository.GetByIdAsync(dto.ManufacturerId.Value);
                    if (mfr == null)
                        return BadRequest(new { message = "Không tìm thấy nhà sản xuất" });
                    product.ManufacturerId = dto.ManufacturerId.Value;
                }
            }

            product.Name = dto.Name ?? product.Name;
            product.Price = dto.Price ?? product.Price;
            product.Stock = dto.Stock ?? product.Stock;
            product.Description = dto.Description ?? product.Description;
            product.ImageUrl = dto.ImageUrl ?? product.ImageUrl;
            if (dto.DiscountPercent.HasValue)
                product.DiscountPercent = dto.DiscountPercent.Value;

            await _productRepository.UpdateAsync(product);
            return Ok(product);
        }

        /// <summary>
        /// Delete product (requires authentication)
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,Warehouse")]
        public async Task<IActionResult> Delete(int id)
        {
            var product = await _productRepository.GetByIdAsync(id);
            if (product == null)
                return NotFound(new { message = "Không tìm thấy sản phẩm" });

            var relatedDetails = await _orderDetailRepository.FindAsync(od => od.ProductId == id);
            if (relatedDetails.Any())
                return BadRequest(new { message = "Không thể xóa sản phẩm đã có trong đơn hàng" });

            try
            {
                await _productRepository.DeleteAsync(product);
                return Ok(new { message = "Xóa sản phẩm thành công" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi xóa sản phẩm: " + ex.Message });
            }
        }

        /// <summary>
        /// Upload product image (requires authentication)
        /// POST /api/products/{id}/image  — multipart/form-data, field name: "image"
        /// </summary>
        [HttpPost("{id}/image")]
        [Authorize(Roles = "Admin,Warehouse")]
        public async Task<IActionResult> UploadImage(int id, IFormFile? image)
        {
            var product = await _productRepository.GetByIdAsync(id);
            if (product == null)
                return NotFound(new { message = "Không tìm thấy sản phẩm" });

            if (image == null || image.Length == 0)
                return BadRequest(new { message = "Vui lòng chọn file ảnh" });

            var allowed = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
            var ext = Path.GetExtension(image.FileName).ToLowerInvariant();
            if (!allowed.Contains(ext))
                return BadRequest(new { message = "Chỉ chấp nhận file .jpg .png .gif .webp" });

            var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
            Directory.CreateDirectory(uploadsDir);

            // Xóa ảnh cũ của sản phẩm (tránh để lại file thừa khi đổi định dạng)
            foreach (var oldExt in new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" })
            {
                var oldFile = Path.Combine(uploadsDir, $"product_{id}{oldExt}");
                if (System.IO.File.Exists(oldFile)) System.IO.File.Delete(oldFile);
            }

            var fileName = $"product_{id}{ext}";
            var filePath = Path.Combine(uploadsDir, fileName);

            using (var stream = System.IO.File.Create(filePath))
                await image.CopyToAsync(stream);

            product.ImageUrl = $"/uploads/{fileName}";
            await _productRepository.UpdateAsync(product);

            return Ok(new { imageUrl = product.ImageUrl, message = "Upload ảnh thành công" });
        }

        /// <summary>
        /// Update product discount
        /// </summary>
        [HttpPut("{id}/discount")]
        [Authorize(Roles = "Admin,Warehouse")]
        public async Task<IActionResult> UpdateDiscount(int id, [FromBody] UpdateDiscountDto dto)
        {
            if (dto.DiscountPercent < 0 || dto.DiscountPercent > 99)
                return BadRequest(new { message = "Phần trăm giảm giá phải từ 0 đến 99" });

            var product = await _productRepository.GetByIdAsync(id);
            if (product == null)
                return NotFound(new { message = "Không tìm thấy sản phẩm" });

            product.DiscountPercent = dto.DiscountPercent;
            await _productRepository.UpdateAsync(product);

            return Ok(new { message = "Cập nhật giảm giá thành công", discountPercent = product.DiscountPercent, product });
        }

        /// <summary>
        /// Get products by category
        /// </summary>
        [HttpGet("category/{categoryId}")]
        public async Task<IActionResult> GetByCategory(int categoryId)
        {
            var products = await _productRepository.GetByCategoryAsync(categoryId);
            var shapedProducts = new List<object>();
            foreach (var product in products)
                shapedProducts.Add(await ToProductResponse(product));
            return Ok(shapedProducts);
        }

        [HttpGet("{id}/reviews")]
        public async Task<IActionResult> GetReviews(int id)
        {
            var product = await _productRepository.GetByIdAsync(id);
            if (product == null)
                return NotFound(new { message = "Không tìm thấy sản phẩm" });

            var reviews = await _db.ProductReviews
                .Where(r => r.ProductId == id)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new
                {
                    r.Id,
                    r.ProductId,
                    r.OrderId,
                    r.Rating,
                    r.Comment,
                    r.CreatedAt
                })
                .ToListAsync();

            return Ok(new
            {
                averageRating = reviews.Count == 0 ? 0 : Math.Round(reviews.Average(r => r.Rating), 1),
                reviewCount = reviews.Count,
                items = reviews
            });
        }

        [HttpPost("{id}/reviews")]
        [Authorize]
        public async Task<IActionResult> CreateReview(int id, [FromBody] ProductReviewDto dto)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userGuid))
                return Unauthorized();

            if (dto.Rating < 1 || dto.Rating > 5)
                return BadRequest(new { message = "Số sao đánh giá phải từ 1 đến 5" });

            var comment = (dto.Comment ?? "").Trim();
            if (comment.Length > 1000)
                return BadRequest(new { message = "Bình luận tối đa 1000 ký tự" });

            var order = await _db.Orders.FirstOrDefaultAsync(o => o.Id == dto.OrderId && o.UserId == userGuid);
            if (order == null)
                return BadRequest(new { message = "Không tìm thấy đơn hàng hợp lệ" });

            if (order.Status != "Completed")
                return BadRequest(new { message = "Chỉ có thể đánh giá sau khi đã nhận hàng" });

            var purchased = await _db.OrderDetails.AnyAsync(d => d.OrderId == dto.OrderId && d.ProductId == id);
            if (!purchased)
                return BadRequest(new { message = "Sản phẩm không thuộc đơn hàng này" });

            var review = await _db.ProductReviews
                .FirstOrDefaultAsync(r => r.OrderId == dto.OrderId && r.ProductId == id && r.UserId == userGuid);

            if (review != null)
                return BadRequest(new { message = "Bạn chỉ được đánh giá sản phẩm này một lần trong đơn hàng này" });

            review = new ProductReview
            {
                ProductId = id,
                OrderId = dto.OrderId,
                UserId = userGuid,
                Rating = dto.Rating,
                Comment = comment,
                CreatedAt = DateTime.Now
            };
            _db.ProductReviews.Add(review);

            await _db.SaveChangesAsync();
            return Ok(new { message = "Đã lưu đánh giá sản phẩm", review });
        }
    }

    // DTOs
    public class ProductCreateDto
    {
        [Required(ErrorMessage = "Tên sản phẩm không được để trống")]
        [StringLength(200, MinimumLength = 1, ErrorMessage = "Tên sản phẩm tối đa 200 ký tự")]
        public string Name { get; set; } = "";

        [Range(0.01, double.MaxValue, ErrorMessage = "Giá phải lớn hơn 0")]
        public decimal Price { get; set; }

        [Range(0, int.MaxValue, ErrorMessage = "Tồn kho không được âm")]
        public int Stock { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "Danh mục không hợp lệ")]
        public int CategoryId { get; set; }

        public string? Description { get; set; }
        public string? ImageUrl { get; set; }

        [Range(0, 99, ErrorMessage = "Giảm giá phải từ 0 đến 99")]
        public decimal? DiscountPercent { get; set; }

        public int? ManufacturerId { get; set; }
    }

    public class ProductUpdateDto
    {
        [StringLength(200, MinimumLength = 1, ErrorMessage = "Tên sản phẩm tối đa 200 ký tự")]
        public string? Name { get; set; }

        [Range(0.01, double.MaxValue, ErrorMessage = "Giá phải lớn hơn 0")]
        public decimal? Price { get; set; }

        [Range(0, int.MaxValue, ErrorMessage = "Tồn kho không được âm")]
        public int? Stock { get; set; }

        public int? CategoryId { get; set; }
        public string? Description { get; set; }
        public string? ImageUrl { get; set; }

        [Range(0, 99, ErrorMessage = "Giảm giá phải từ 0 đến 99")]
        public decimal? DiscountPercent { get; set; }

        public int? ManufacturerId { get; set; }
    }

    public class UpdateDiscountDto
    {
        [Range(0, 99, ErrorMessage = "Giảm giá phải từ 0 đến 99")]
        public decimal DiscountPercent { get; set; }
    }

    public class ProductReviewDto
    {
        public int OrderId { get; set; }
        public int Rating { get; set; }
        public string? Comment { get; set; }
    }
}
