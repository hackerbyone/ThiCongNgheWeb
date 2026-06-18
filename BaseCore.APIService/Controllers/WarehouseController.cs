using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BaseCore.Repository;
using BaseCore.Entities;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace BaseCore.APIService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin,Warehouse")]
    public class WarehouseController : ControllerBase
    {
        private readonly AppDbContext _db;

        public WarehouseController(AppDbContext db) => _db = db;

        private string CurrentUser => User.Identity?.Name ?? "system";

        private void AddLog(int productId, string type, int qty, int before, int after, int? refId = null, string notes = null)
        {
            _db.StockTransactionLogs.Add(new StockTransactionLog
            {
                ProductId       = productId,
                TransactionType = type,
                Quantity        = qty,
                StockBefore     = before,
                StockAfter      = after,
                ReferenceId     = refId,
                Notes           = notes,
                CreatedAt       = DateTime.Now,
                CreatedBy       = CurrentUser
            });
        }

        // ── INVENTORY ──────────────────────────────────────────────────────
        [HttpGet("inventory")]
        public async Task<IActionResult> GetInventory()
        {
            var products = await _db.Products.Include(p => p.Category)
                .OrderBy(p => p.CategoryId).ThenBy(p => p.Name).ToListAsync();

            var received = await _db.WarehouseReceipts
                .GroupBy(r => r.ProductId)
                .Select(g => new { g.Key, v = g.Sum(r => r.Quantity) }).ToListAsync();

            // FIX: tính sold bao gồm cả Processing vì kho đã bị trừ khi duyệt (approve)
            var sold = await _db.OrderDetails.Include(od => od.Order)
                .Where(od => od.Order.Status == "Completed" || od.Order.Status == "Processing")
                .GroupBy(od => od.ProductId)
                .Select(g => new { g.Key, v = g.Sum(od => od.Quantity) }).ToListAsync();

            var damaged = await _db.DamagedGoods
                .GroupBy(d => d.ProductId)
                .Select(g => new { g.Key, v = g.Sum(d => d.Quantity) }).ToListAsync();

            var result = products.Select(p => new
            {
                p.Id, p.Name, p.Price, p.Stock,
                CategoryName   = p.Category?.Name ?? "",
                TotalReceived  = received.FirstOrDefault(x => x.Key == p.Id)?.v ?? 0,
                TotalSold      = sold.FirstOrDefault(x => x.Key == p.Id)?.v ?? 0,
                TotalDamaged   = damaged.FirstOrDefault(x => x.Key == p.Id)?.v ?? 0,
            });

            return Ok(result);
        }

        // ── RECEIPTS ───────────────────────────────────────────────────────
        [HttpGet("receipts")]
        public async Task<IActionResult> GetReceipts([FromQuery] int page = 1, [FromQuery] int pageSize = 10,
            [FromQuery] string startDate = null, [FromQuery] string endDate = null, [FromQuery] int? productId = null)
        {
            var q = _db.WarehouseReceipts.Include(r => r.Product).ThenInclude(p => p.Category).AsQueryable();
            if (productId.HasValue) q = q.Where(r => r.ProductId == productId.Value);
            if (DateTime.TryParse(startDate, out var s)) q = q.Where(r => r.ReceivedDate >= s);
            if (DateTime.TryParse(endDate, out var e)) q = q.Where(r => r.ReceivedDate <= e.AddDays(1));

            var total = await q.CountAsync();
            var items = await q.OrderByDescending(r => r.ReceivedDate)
                .Skip((page - 1) * pageSize).Take(pageSize)
                .Select(r => new {
                    r.Id, r.ProductId, ProductName = r.Product.Name,
                    CategoryName = r.Product.Category != null ? r.Product.Category.Name : "",
                    r.Quantity, r.UnitCost, r.TotalCost, r.Supplier, r.ReceivedDate, r.Notes, r.CreatedBy
                }).ToListAsync();

            return Ok(new { items, totalCount = total, totalPages = (int)Math.Ceiling(total / (double)pageSize), page });
        }

        [HttpPost("receipts")]
        public async Task<IActionResult> CreateReceipt([FromBody] WarehouseReceiptDto dto)
        {
            if (dto.Quantity <= 0)
                return BadRequest(new { message = "Số lượng nhập kho phải lớn hơn 0" });
            if (dto.UnitCost < 0)
                return BadRequest(new { message = "Giá nhập không được âm" });

            var product = await _db.Products.FindAsync(dto.ProductId);
            if (product == null) return NotFound(new { message = "Sản phẩm không tồn tại" });

            int before = product.Stock;
            var receipt = new WarehouseReceipt
            {
                ProductId    = dto.ProductId,
                Quantity     = dto.Quantity,
                UnitCost     = dto.UnitCost,
                TotalCost    = dto.Quantity * dto.UnitCost,
                Supplier     = dto.Supplier,
                ReceivedDate = dto.ReceivedDate ?? DateTime.Now,
                Notes        = dto.Notes,
                CreatedBy    = CurrentUser
            };

            product.Stock += dto.Quantity;
            _db.WarehouseReceipts.Add(receipt);

            // FIX: thêm log vào context trước, lưu tất cả trong 1 transaction
            AddLog(dto.ProductId, "Nhập kho", dto.Quantity, before, product.Stock,
                null, $"Nhập {dto.Quantity} sp từ {dto.Supplier ?? "không rõ"}. {dto.Notes}");

            await _db.SaveChangesAsync();

            return Ok(new { message = "Nhập kho thành công", receipt.Id });
        }

        [HttpPut("receipts/{id}")]
        public async Task<IActionResult> UpdateReceipt(int id, [FromBody] WarehouseReceiptDto dto)
        {
            if (dto.Quantity <= 0)
                return BadRequest(new { message = "Số lượng nhập kho phải lớn hơn 0" });

            var receipt = await _db.WarehouseReceipts.FindAsync(id);
            if (receipt == null) return NotFound(new { message = "Phiếu nhập không tồn tại" });

            var product = await _db.Products.FindAsync(receipt.ProductId);
            int before = product?.Stock ?? 0;
            int delta  = dto.Quantity - receipt.Quantity;

            if (product != null) product.Stock = Math.Max(0, product.Stock + delta);
            receipt.Quantity     = dto.Quantity;
            receipt.UnitCost     = dto.UnitCost;
            receipt.TotalCost    = dto.Quantity * dto.UnitCost;
            receipt.Supplier     = dto.Supplier;
            receipt.ReceivedDate = dto.ReceivedDate ?? receipt.ReceivedDate;
            receipt.Notes        = dto.Notes;

            // FIX: thêm log trước rồi lưu 1 lần
            if (delta != 0)
                AddLog(receipt.ProductId, "Điều chỉnh nhập", delta, before,
                    product?.Stock ?? before + delta, id,
                    $"Điều chỉnh phiếu #{id}: {(delta > 0 ? "+" : "")}{delta} sp");

            await _db.SaveChangesAsync();

            return Ok(new { message = "Cập nhật phiếu nhập thành công" });
        }

        [HttpDelete("receipts/{id}")]
        public async Task<IActionResult> DeleteReceipt(int id)
        {
            var receipt = await _db.WarehouseReceipts.FindAsync(id);
            if (receipt == null) return NotFound(new { message = "Phiếu nhập không tồn tại" });

            var product = await _db.Products.FindAsync(receipt.ProductId);
            int before = product?.Stock ?? 0;
            if (product != null) product.Stock = Math.Max(0, product.Stock - receipt.Quantity);

            // FIX: thêm log + xóa receipt cùng 1 lần SaveChanges
            AddLog(receipt.ProductId, "Hoàn nhập kho", -receipt.Quantity, before,
                product?.Stock ?? before - receipt.Quantity, null,
                $"Xóa phiếu nhập #{id}, hoàn lại {receipt.Quantity} sp");

            _db.WarehouseReceipts.Remove(receipt);
            await _db.SaveChangesAsync();

            return Ok(new { message = "Đã xóa phiếu nhập" });
        }

        // ── DAMAGED ────────────────────────────────────────────────────────
        [HttpGet("damaged")]
        public async Task<IActionResult> GetDamaged([FromQuery] int page = 1, [FromQuery] int pageSize = 10,
            [FromQuery] string startDate = null, [FromQuery] string endDate = null)
        {
            var q = _db.DamagedGoods.Include(d => d.Product).ThenInclude(p => p.Category).AsQueryable();
            if (DateTime.TryParse(startDate, out var s)) q = q.Where(d => d.ReportedDate >= s);
            if (DateTime.TryParse(endDate, out var e)) q = q.Where(d => d.ReportedDate <= e.AddDays(1));

            var total = await q.CountAsync();
            var items = await q.OrderByDescending(d => d.ReportedDate)
                .Skip((page - 1) * pageSize).Take(pageSize)
                .Select(d => new {
                    d.Id, d.ProductId, ProductName = d.Product.Name,
                    CategoryName = d.Product.Category != null ? d.Product.Category.Name : "",
                    d.Quantity, d.Reason, d.ReportedDate, d.Notes
                }).ToListAsync();

            return Ok(new { items, totalCount = total, totalPages = (int)Math.Ceiling(total / (double)pageSize), page });
        }

        [HttpPost("damaged")]
        public async Task<IActionResult> CreateDamaged([FromBody] DamagedGoodsDto dto)
        {
            if (dto.Quantity <= 0)
                return BadRequest(new { message = "Số lượng hàng hư phải lớn hơn 0" });

            var product = await _db.Products.FindAsync(dto.ProductId);
            if (product == null) return NotFound(new { message = "Sản phẩm không tồn tại" });

            // FIX: không cho báo hư nhiều hơn tồn kho hiện tại
            if (dto.Quantity > product.Stock)
                return BadRequest(new { message = $"Số lượng báo hư ({dto.Quantity}) lớn hơn tồn kho hiện tại ({product.Stock})" });

            int before = product.Stock;
            var record = new DamagedGoods
            {
                ProductId    = dto.ProductId,
                Quantity     = dto.Quantity,
                Reason       = dto.Reason,
                ReportedDate = dto.ReportedDate ?? DateTime.Now,
                Notes        = dto.Notes
            };

            product.Stock -= dto.Quantity;
            _db.DamagedGoods.Add(record);

            // FIX: thêm log vào context, lưu tất cả 1 lần
            AddLog(dto.ProductId, "Hư hỏng", -dto.Quantity, before, product.Stock,
                null, $"Hàng hư hỏng: {dto.Quantity} sp. Lý do: {dto.Reason ?? "không rõ"}");

            await _db.SaveChangesAsync();

            return Ok(new { message = "Ghi nhận hàng hư hỏng thành công", record.Id });
        }

        [HttpDelete("damaged/{id}")]
        public async Task<IActionResult> DeleteDamaged(int id)
        {
            var record = await _db.DamagedGoods.FindAsync(id);
            if (record == null) return NotFound(new { message = "Bản ghi không tồn tại" });

            var product = await _db.Products.FindAsync(record.ProductId);
            int before = product?.Stock ?? 0;
            if (product != null) product.Stock += record.Quantity;

            // FIX: thêm log + xóa record cùng 1 lần SaveChanges
            AddLog(record.ProductId, "Hoàn hư hỏng", record.Quantity, before,
                product?.Stock ?? before + record.Quantity, null,
                $"Xóa bản ghi hư hỏng #{id}, hoàn lại {record.Quantity} sp");

            _db.DamagedGoods.Remove(record);
            await _db.SaveChangesAsync();

            return Ok(new { message = "Đã xóa bản ghi hư hỏng" });
        }

        // ── TRANSACTION LOG ────────────────────────────────────────────────
        [HttpGet("transactions")]
        public async Task<IActionResult> GetTransactions([FromQuery] int page = 1, [FromQuery] int pageSize = 15,
            [FromQuery] string startDate = null, [FromQuery] string endDate = null, [FromQuery] int? productId = null)
        {
            var q = _db.StockTransactionLogs.Include(l => l.Product).ThenInclude(p => p.Category).AsQueryable();
            if (productId.HasValue) q = q.Where(l => l.ProductId == productId.Value);
            if (DateTime.TryParse(startDate, out var s)) q = q.Where(l => l.CreatedAt >= s);
            if (DateTime.TryParse(endDate, out var e)) q = q.Where(l => l.CreatedAt <= e.AddDays(1));

            var total = await q.CountAsync();
            var items = await q.OrderByDescending(l => l.CreatedAt)
                .Skip((page - 1) * pageSize).Take(pageSize)
                .Select(l => new {
                    l.Id, l.ProductId, ProductName = l.Product.Name,
                    CategoryName = l.Product.Category != null ? l.Product.Category.Name : "",
                    l.TransactionType, l.Quantity, l.StockBefore, l.StockAfter,
                    l.ReferenceId, l.Notes, l.CreatedAt, l.CreatedBy
                }).ToListAsync();

            return Ok(new { items, totalCount = total, totalPages = (int)Math.Ceiling(total / (double)pageSize), page });
        }

        // ── PRODUCT MANAGEMENT ─────────────────────────────────────────────
        [HttpGet("products")]
        public async Task<IActionResult> GetProducts([FromQuery] string keyword = null,
            [FromQuery] int? categoryId = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 15)
        {
            var q = _db.Products.Include(p => p.Category).Include(p => p.Manufacturer).AsQueryable();
            if (!string.IsNullOrEmpty(keyword))
                q = q.Where(p => p.Name.Contains(keyword));
            if (categoryId.HasValue)
                q = q.Where(p => p.CategoryId == categoryId.Value);

            var total = await q.CountAsync();
            var items = await q.OrderBy(p => p.CategoryId).ThenBy(p => p.Name)
                .Skip((page - 1) * pageSize).Take(pageSize)
                .Select(p => new {
                    p.Id, p.Name, p.Price, p.Stock, p.Description, p.ImageUrl,
                    p.CategoryId, CategoryName = p.Category != null ? p.Category.Name : "",
                    p.ManufacturerId, ManufacturerName = p.Manufacturer != null ? p.Manufacturer.Name : "",
                    p.DiscountPercent
                }).ToListAsync();

            return Ok(new { items, totalCount = total, totalPages = (int)Math.Ceiling(total / (double)pageSize), page });
        }

        [HttpPost("products")]
        public async Task<IActionResult> CreateProduct([FromBody] WarehouseProductDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
                return BadRequest(new { message = "Tên sản phẩm không được để trống" });
            if (dto.Price <= 0)
                return BadRequest(new { message = "Giá sản phẩm phải lớn hơn 0" });
            if (dto.Stock < 0)
                return BadRequest(new { message = "Tồn kho không được âm" });
            if (dto.DiscountPercent < 0 || dto.DiscountPercent > 99)
                return BadRequest(new { message = "Giảm giá phải từ 0 đến 99%" });

            var categoryExists = await _db.Categories.AnyAsync(c => c.Id == dto.CategoryId);
            if (!categoryExists)
                return BadRequest(new { message = "Danh mục sản phẩm không tồn tại" });

            if (dto.ManufacturerId.HasValue && dto.ManufacturerId.Value > 0)
            {
                var manufacturerExists = await _db.Manufacturers.AnyAsync(m => m.Id == dto.ManufacturerId.Value);
                if (!manufacturerExists)
                    return BadRequest(new { message = "Nhà sản xuất không tồn tại" });
            }

            var product = new Product
            {
                Name           = dto.Name.Trim(),
                Price          = dto.Price,
                Stock          = dto.Stock,
                CategoryId     = dto.CategoryId,
                ManufacturerId = dto.ManufacturerId.HasValue && dto.ManufacturerId.Value > 0 ? dto.ManufacturerId : null,
                Description    = dto.Description ?? "",
                ImageUrl       = dto.ImageUrl ?? "",
                DiscountPercent = dto.DiscountPercent
            };
            _db.Products.Add(product);
            await _db.SaveChangesAsync();

            if (dto.Stock > 0)
            {
                AddLog(product.Id, "Tạo sản phẩm", dto.Stock, 0, dto.Stock, null,
                    $"Tạo sản phẩm mới với tồn kho ban đầu: {dto.Stock}");
                await _db.SaveChangesAsync();
            }

            return Ok(new { message = "Tạo sản phẩm thành công", id = product.Id });
        }

        [HttpPut("products/{id}")]
        public async Task<IActionResult> UpdateProduct(int id, [FromBody] WarehouseProductDto dto)
        {
            var product = await _db.Products.FindAsync(id);
            if (product == null) return NotFound(new { message = "Sản phẩm không tồn tại" });

            int before = product.Stock;
            product.Name        = dto.Name ?? product.Name;
            product.Price       = dto.Price > 0 ? dto.Price : product.Price;
            product.Description = dto.Description ?? product.Description;
            product.ImageUrl    = dto.ImageUrl ?? product.ImageUrl;
            product.CategoryId  = dto.CategoryId > 0 ? dto.CategoryId : product.CategoryId;
            product.ManufacturerId = dto.ManufacturerId.HasValue
                ? (dto.ManufacturerId.Value > 0 ? dto.ManufacturerId : null)
                : product.ManufacturerId;
            product.DiscountPercent = dto.DiscountPercent >= 0 ? dto.DiscountPercent : product.DiscountPercent;

            if (dto.Stock >= 0 && dto.Stock != before)
            {
                int delta = dto.Stock - before;
                product.Stock = dto.Stock;
                AddLog(id, "Điều chỉnh thủ công", delta, before, dto.Stock, null,
                    $"Điều chỉnh tồn kho từ {before} → {dto.Stock}. {dto.StockNote}");
            }

            await _db.SaveChangesAsync();
            return Ok(new { message = "Cập nhật sản phẩm thành công" });
        }

        [HttpDelete("products/{id}")]
        public async Task<IActionResult> DeleteProduct(int id)
        {
            var product = await _db.Products.FindAsync(id);
            if (product == null) return NotFound(new { message = "Sản phẩm không tồn tại" });

            var hasOrders = await _db.OrderDetails.AnyAsync(od => od.ProductId == id);
            if (hasOrders) return BadRequest(new { message = "Không thể xóa sản phẩm đã có trong đơn hàng" });

            try
            {
                _db.Products.Remove(product);
                await _db.SaveChangesAsync();
                return Ok(new { message = "Đã xóa sản phẩm" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi xóa sản phẩm: " + ex.Message });
            }
        }

        // ── REPORT ────────────────────────────────────────────────────────
        [HttpGet("report")]
        public async Task<IActionResult> GetReport([FromQuery] string startDate = null, [FromQuery] string endDate = null)
        {
            DateTime start = DateTime.TryParse(startDate, out var s) ? s : DateTime.Now.AddMonths(-1);
            DateTime end   = DateTime.TryParse(endDate,   out var e) ? e.AddDays(1) : DateTime.Now.AddDays(1);

            var receipts = await _db.WarehouseReceipts
                .Include(r => r.Product).ThenInclude(p => p.Category)
                .Where(r => r.ReceivedDate >= start && r.ReceivedDate < end)
                .GroupBy(r => new { r.ProductId, ProductName = r.Product.Name, CategoryName = r.Product.Category != null ? r.Product.Category.Name : "" })
                .Select(g => new { g.Key.ProductId, g.Key.ProductName, g.Key.CategoryName, QuantityReceived = g.Sum(r => r.Quantity), TotalCostReceived = g.Sum(r => r.TotalCost) })
                .ToListAsync();

            // FIX: tính sold bao gồm cả Processing (kho đã bị trừ khi duyệt)
            var sold = await _db.OrderDetails
                .Include(od => od.Order).Include(od => od.Product).ThenInclude(p => p.Category)
                .Where(od => (od.Order.Status == "Completed" || od.Order.Status == "Processing")
                             && od.Order.OrderDate >= start && od.Order.OrderDate < end)
                .GroupBy(od => new { od.ProductId, ProductName = od.Product.Name, CategoryName = od.Product.Category != null ? od.Product.Category.Name : "" })
                .Select(g => new { g.Key.ProductId, g.Key.ProductName, g.Key.CategoryName, QuantitySold = g.Sum(od => od.Quantity), Revenue = g.Sum(od => od.Quantity * od.UnitPrice) })
                .ToListAsync();

            var damaged = await _db.DamagedGoods
                .Include(d => d.Product).ThenInclude(p => p.Category)
                .Where(d => d.ReportedDate >= start && d.ReportedDate < end)
                .GroupBy(d => new { d.ProductId, ProductName = d.Product.Name, CategoryName = d.Product.Category != null ? d.Product.Category.Name : "" })
                .Select(g => new { g.Key.ProductId, g.Key.ProductName, g.Key.CategoryName, QuantityDamaged = g.Sum(d => d.Quantity) })
                .ToListAsync();

            var allIds    = receipts.Select(r => r.ProductId).Union(sold.Select(sv => sv.ProductId)).Union(damaged.Select(d => d.ProductId)).Distinct();
            var products  = await _db.Products.Include(p => p.Category).Where(p => allIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id);

            var details = allIds.Select(pid =>
            {
                var r  = receipts.FirstOrDefault(x => x.ProductId == pid);
                var sv = sold.FirstOrDefault(x => x.ProductId == pid);
                var d  = damaged.FirstOrDefault(x => x.ProductId == pid);
                var p  = products.GetValueOrDefault(pid);
                return new {
                    ProductId        = pid,
                    ProductName      = p?.Name ?? r?.ProductName ?? sv?.ProductName ?? d?.ProductName ?? "",
                    CategoryName     = p?.Category?.Name ?? r?.CategoryName ?? sv?.CategoryName ?? d?.CategoryName ?? "",
                    CurrentStock     = p?.Stock ?? 0,
                    QuantityReceived = r?.QuantityReceived ?? 0,
                    TotalCostReceived = r?.TotalCostReceived ?? 0m,
                    QuantitySold     = sv?.QuantitySold ?? 0,
                    Revenue          = sv?.Revenue ?? 0m,
                    QuantityDamaged  = d?.QuantityDamaged ?? 0,
                };
            }).OrderBy(x => x.CategoryName).ThenBy(x => x.ProductName).ToList();

            var summary = new {
                StartDate    = start,
                EndDate      = end.AddDays(-1),
                TotalReceived = details.Sum(x => x.QuantityReceived),
                TotalSold    = details.Sum(x => x.QuantitySold),
                TotalDamaged = details.Sum(x => x.QuantityDamaged),
                TotalRevenue = details.Sum(x => x.Revenue),
                TotalCost    = details.Sum(x => x.TotalCostReceived),
            };

            return Ok(new { summary, details });
        }
    }

    public class WarehouseReceiptDto
    {
        public int ProductId { get; set; }
        public int Quantity { get; set; }
        public decimal UnitCost { get; set; }
        public string Supplier { get; set; }
        public DateTime? ReceivedDate { get; set; }
        public string Notes { get; set; }
    }

    public class DamagedGoodsDto
    {
        public int ProductId { get; set; }
        public int Quantity { get; set; }
        public string Reason { get; set; }
        public DateTime? ReportedDate { get; set; }
        public string Notes { get; set; }
    }

    public class WarehouseProductDto
    {
        public string Name { get; set; }
        public decimal Price { get; set; }
        public int Stock { get; set; } = -1;
        public int CategoryId { get; set; }
        public int? ManufacturerId { get; set; }
        public string Description { get; set; }
        public string ImageUrl { get; set; }
        public decimal DiscountPercent { get; set; }
        public string? StockNote { get; set; }
    }
}
