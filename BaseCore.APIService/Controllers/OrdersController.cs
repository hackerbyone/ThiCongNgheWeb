using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;
using BaseCore.Repository;
using BaseCore.Repository.EFCore;
using IProductRepository = BaseCore.Repository.EFCore.IProductRepository;
using System;
using System.Security.Claims;
using System.Linq;

namespace BaseCore.APIService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class OrdersController : ControllerBase
    {
        private readonly IOrderRepository _orderRepository;
        private readonly IOrderDetailRepository _orderDetailRepository;
        private readonly IProductRepository _productRepository;
        private readonly IManufacturerRepository _manufacturerRepository;
        private readonly AppDbContext _db;

        public OrdersController(
            IOrderRepository orderRepository,
            IOrderDetailRepository orderDetailRepository,
            IProductRepository productRepository,
            IManufacturerRepository manufacturerRepository,
            AppDbContext db)
        {
            _orderRepository = orderRepository;
            _orderDetailRepository = orderDetailRepository;
            _productRepository = productRepository;
            _manufacturerRepository = manufacturerRepository;
            _db = db;
        }

        // GET /api/orders — đơn hàng của khách hàng hiện tại
        [HttpGet]
        public async Task<IActionResult> GetMyOrders()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userGuid))
                    return Unauthorized();

                var orders = await _orderRepository.GetByUserAsync(userGuid);
                return Ok(orders);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi tải đơn hàng: " + ex.Message });
            }
        }

        // GET /api/orders/stats — thống kê đơn hàng (Admin) — truy vấn trực tiếp trên DB
        [HttpGet("stats")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetStats()
        {
            var totalOrders      = await _db.Orders.CountAsync();
            var pendingOrders    = await _db.Orders.CountAsync(o => o.Status == "Pending");
            var processingOrders = await _db.Orders.CountAsync(o => o.Status == "Processing");
            var completedOrders  = await _db.Orders.CountAsync(o => o.Status == "Completed");
            var cancelledOrders  = await _db.Orders.CountAsync(o => o.Status == "Cancelled");
            var rejectedOrders   = await _db.Orders.CountAsync(o => o.Status == "Rejected");
            var totalRevenue     = await _db.Orders
                .Where(o => o.Status == "Completed")
                .SumAsync(o => (decimal?)o.TotalAmount) ?? 0m;
            var totalProducts     = await _db.Products.CountAsync();
            var totalManufacturers = await _db.Manufacturers.CountAsync();

            return Ok(new
            {
                totalOrders, pendingOrders, processingOrders,
                completedOrders, cancelledOrders, rejectedOrders,
                totalRevenue, totalProducts, totalManufacturers
            });
        }

        // GET /api/orders/all — tất cả đơn hàng (Admin) — filter trực tiếp trên DB
        [HttpGet("all")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAllOrders(
            [FromQuery] string? status,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var query = _db.Orders.AsQueryable();

            if (!string.IsNullOrEmpty(status))
                query = query.Where(o => o.Status == status);
            if (startDate.HasValue)
                query = query.Where(o => o.OrderDate >= startDate.Value.Date);
            if (endDate.HasValue)
                query = query.Where(o => o.OrderDate < endDate.Value.Date.AddDays(1));

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(o => o.OrderDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(new
            {
                items,
                totalCount,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
            });
        }

        // GET /api/orders/revenue-summary — doanh thu theo ngày (Admin) — filter trên DB
        [HttpGet("revenue-summary")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetRevenueSummary(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            var query = _db.Orders.AsQueryable();

            if (startDate.HasValue)
                query = query.Where(o => o.OrderDate >= startDate.Value.Date);
            if (endDate.HasValue)
                query = query.Where(o => o.OrderDate < endDate.Value.Date.AddDays(1));

            var filtered = await query.ToListAsync();

            var revenueByDay = filtered
                .Where(o => o.Status == "Completed")
                .GroupBy(o => o.OrderDate.Date)
                .Select(g => new
                {
                    date = g.Key.ToString("yyyy-MM-dd"),
                    revenue = g.Sum(o => o.TotalAmount),
                    orderCount = g.Count()
                })
                .OrderBy(x => x.date)
                .ToList();

            var ordersByDay = filtered
                .GroupBy(o => o.OrderDate.Date)
                .Select(g => new
                {
                    date = g.Key.ToString("yyyy-MM-dd"),
                    total      = g.Count(),
                    pending    = g.Count(o => o.Status == "Pending"),
                    processing = g.Count(o => o.Status == "Processing"),
                    completed  = g.Count(o => o.Status == "Completed"),
                    cancelled  = g.Count(o => o.Status == "Cancelled"),
                    rejected   = g.Count(o => o.Status == "Rejected")
                })
                .OrderBy(x => x.date)
                .ToList();

            var statusSummary = new
            {
                pending    = filtered.Count(o => o.Status == "Pending"),
                processing = filtered.Count(o => o.Status == "Processing"),
                completed  = filtered.Count(o => o.Status == "Completed"),
                cancelled  = filtered.Count(o => o.Status == "Cancelled"),
                rejected   = filtered.Count(o => o.Status == "Rejected"),
                totalRevenue = filtered.Where(o => o.Status == "Completed").Sum(o => (decimal?)o.TotalAmount) ?? 0m,
                totalOrders  = filtered.Count
            };

            return Ok(new { revenueByDay, ordersByDay, statusSummary });
        }

        // GET /api/orders/{id} — chi tiết đơn hàng kèm sản phẩm (không N+1 query)
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var order = await _orderRepository.GetByIdAsync(id);
                if (order == null) return NotFound(new { message = "Không tìm thấy đơn hàng" });

                // GetByOrderAsync đã Include Product → không cần query thêm cho từng item
                var details = await _orderDetailRepository.GetByOrderAsync(id);
                var detailsWithProduct = details.Select(d => new
                {
                    d.Id,
                    d.OrderId,
                    d.ProductId,
                    productName  = d.Product?.Name ?? "Sản phẩm đã xóa",
                    productImage = d.Product?.ImageUrl ?? "",
                    d.Quantity,
                    d.UnitPrice
                }).ToList();

                return Ok(new { order, details = detailsWithProduct });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi tải chi tiết đơn hàng: " + ex.Message });
            }
        }

        // POST /api/orders — tạo đơn hàng mới (KHÔNG trừ kho, chờ admin duyệt)
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateOrderDto dto)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userGuid))
                return Unauthorized();

            // --- Validation đầu vào ---
            if (dto.Items == null || !dto.Items.Any())
                return BadRequest(new { message = "Đơn hàng phải có ít nhất 1 sản phẩm" });

            if (dto.Items.Any(i => i.Quantity <= 0))
                return BadRequest(new { message = "Số lượng sản phẩm phải lớn hơn 0" });

            if (dto.Items.GroupBy(i => i.ProductId).Any(g => g.Count() > 1))
                return BadRequest(new { message = "Không thể thêm cùng 1 sản phẩm 2 lần trong đơn hàng" });

            decimal totalAmount = 0;
            var orderDetails = new List<OrderDetail>();

            foreach (var item in dto.Items)
            {
                var product = await _productRepository.GetByIdAsync(item.ProductId);
                if (product == null)
                    return BadRequest(new { message = $"Sản phẩm {item.ProductId} không tồn tại" });

                if (product.Stock < item.Quantity)
                    return BadRequest(new { message = $"Sản phẩm '{product.Name}' không đủ tồn kho (còn {product.Stock})" });

                var effectivePrice = product.DiscountPercent > 0
                    ? product.Price * (1 - product.DiscountPercent / 100)
                    : product.Price;

                totalAmount += effectivePrice * item.Quantity;
                orderDetails.Add(new OrderDetail
                {
                    ProductId = item.ProductId,
                    Quantity  = item.Quantity,
                    UnitPrice = effectivePrice
                });
            }

            var order = new Order
            {
                UserId          = userGuid,
                OrderDate       = DateTime.Now,
                TotalAmount     = totalAmount,
                Status          = "Pending",
                ShippingAddress = dto.ShippingAddress ?? ""
            };

            await _orderRepository.AddAsync(order);

            foreach (var detail in orderDetails)
            {
                detail.OrderId = order.Id;
                await _orderDetailRepository.AddAsync(detail);
            }

            return CreatedAtAction(nameof(GetById), new { id = order.Id }, new
            {
                order = new
                {
                    id              = order.Id,
                    userId          = order.UserId,
                    orderDate       = order.OrderDate,
                    totalAmount     = order.TotalAmount,
                    status          = order.Status,
                    shippingAddress = order.ShippingAddress
                },
                details = orderDetails.Select(d => new
                {
                    id        = d.Id,
                    orderId   = d.OrderId,
                    productId = d.ProductId,
                    quantity  = d.Quantity,
                    unitPrice = d.UnitPrice
                })
            });
        }

        // PUT /api/orders/{id}/approve — Admin duyệt đơn (trừ kho, không race condition)
        [HttpPut("{id}/approve")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ApproveOrder(int id)
        {
            var order = await _orderRepository.GetByIdAsync(id);
            if (order == null) return NotFound(new { message = "Không tìm thấy đơn hàng" });

            if (order.Status != "Pending")
                return BadRequest(new { message = "Chỉ có thể duyệt đơn hàng đang chờ xử lý" });

            var details = await _orderDetailRepository.GetByOrderAsync(id);

            // Load tất cả sản phẩm 1 lần duy nhất
            var productIds = details.Select(d => d.ProductId).Distinct().ToList();
            var products = new Dictionary<int, Product>();
            foreach (var pid in productIds)
            {
                var p = await _productRepository.GetByIdAsync(pid);
                if (p == null)
                    return BadRequest(new { message = "Sản phẩm trong đơn hàng không còn tồn tại" });
                products[pid] = p;
            }

            // Kiểm tra tồn kho trước (không tách rời khỏi bước trừ)
            foreach (var detail in details)
            {
                var p = products[detail.ProductId];
                if (p.Stock < detail.Quantity)
                    return BadRequest(new { message = $"'{p.Name}' không đủ tồn kho (còn {p.Stock}, cần {detail.Quantity})" });
            }

            // Trừ kho ngay sau khi kiểm tra (dùng cùng object đã load)
            foreach (var detail in details)
            {
                products[detail.ProductId].Stock -= detail.Quantity;
                await _productRepository.UpdateAsync(products[detail.ProductId]);
            }

            order.Status = "Processing";
            await _orderRepository.UpdateAsync(order);

            return Ok(new { message = "Đã duyệt đơn hàng, kho đã được trừ", order });
        }

        // PUT /api/orders/{id}/reject — Admin từ chối đơn (lưu lý do từ chối)
        [HttpPut("{id}/reject")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> RejectOrder(int id, [FromBody] RejectOrderDto? dto)
        {
            var order = await _orderRepository.GetByIdAsync(id);
            if (order == null) return NotFound(new { message = "Không tìm thấy đơn hàng" });

            if (order.Status != "Pending")
                return BadRequest(new { message = "Chỉ có thể từ chối đơn hàng đang chờ xử lý" });

            order.Status = "Rejected";
            order.CancelReason = dto?.Reason;
            await _orderRepository.UpdateAsync(order);

            return Ok(new { message = "Đã từ chối đơn hàng", order });
        }

        // PUT /api/orders/{id}/status — Admin cập nhật trạng thái (Processing → Completed)
        [HttpPut("{id}/status")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateStatusDto dto)
        {
            var order = await _orderRepository.GetByIdAsync(id);
            if (order == null) return NotFound(new { message = "Không tìm thấy đơn hàng" });

            var validTransitions = new Dictionary<string, string>
            {
                { "Processing", "Completed" }
            };

            if (!validTransitions.TryGetValue(order.Status, out var allowed) || allowed != dto.Status)
                return BadRequest(new { message = $"Không thể chuyển trạng thái từ '{order.Status}' sang '{dto.Status}'" });

            order.Status = dto.Status;
            await _orderRepository.UpdateAsync(order);

            return Ok(order);
        }

        // PUT /api/orders/{id}/cancel — hủy đơn (chỉ hoàn kho nếu đã duyệt)
        [HttpPut("{id}/cancel")]
        public async Task<IActionResult> CancelOrder(int id, [FromBody] RejectOrderDto? dto)
        {
            var userId  = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var isAdmin = User.IsInRole("Admin");

            var order = await _orderRepository.GetByIdAsync(id);
            if (order == null) return NotFound(new { message = "Không tìm thấy đơn hàng" });

            if (!isAdmin && (!Guid.TryParse(userId, out var userGuid) || order.UserId != userGuid))
                return Forbid();

            if (order.Status == "Completed" || order.Status == "Cancelled" || order.Status == "Rejected")
                return BadRequest(new { message = $"Không thể hủy đơn hàng ở trạng thái '{order.Status}'" });

            // Hoàn kho chỉ khi đơn đã được duyệt (kho đã bị trừ)
            if (order.Status == "Processing")
            {
                var details = await _orderDetailRepository.GetByOrderAsync(id);
                foreach (var detail in details)
                {
                    var product = await _productRepository.GetByIdAsync(detail.ProductId);
                    if (product != null)
                    {
                        product.Stock += detail.Quantity;
                        await _productRepository.UpdateAsync(product);
                    }
                }
            }

            order.Status = "Cancelled";
            order.CancelReason = dto?.Reason;
            await _orderRepository.UpdateAsync(order);

            return Ok(new { message = "Đơn hàng đã được hủy", order });
        }
    }

    public class CreateOrderDto
    {
        public List<OrderItemDto> Items { get; set; } = new();
        public string? ShippingAddress { get; set; }
    }

    public class OrderItemDto
    {
        public int ProductId { get; set; }
        public int Quantity { get; set; }
    }

    public class UpdateStatusDto
    {
        public string Status { get; set; } = "";
    }

    public class RejectOrderDto
    {
        public string? Reason { get; set; }
    }
}
