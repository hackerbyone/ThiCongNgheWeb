using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BaseCore.Repository;
using System;

namespace BaseCore.APIService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class DashboardController : ControllerBase
    {
        private readonly AppDbContext _db;

        public DashboardController(AppDbContext db)
        {
            _db = db;
        }

        // GET /api/dashboard/stats — thống kê tổng hợp, truy vấn trực tiếp trên DB
        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            try
            {
                var totalProducts   = await _db.Products.CountAsync();
                var totalCategories = await _db.Categories.CountAsync();

                if (!User.IsInRole("Admin"))
                {
                    return Ok(new
                    {
                        totalProducts,
                        totalCategories,
                        totalUsers       = (int?)null,
                        totalOrders      = (int?)null,
                        pendingOrders    = (int?)null,
                        processingOrders = (int?)null,
                        completedOrders  = (int?)null,
                        totalRevenue     = (decimal?)null
                    });
                }

                var totalUsers       = await _db.Users.CountAsync();
                var totalOrders      = await _db.Orders.CountAsync();
                var pendingOrders    = await _db.Orders.CountAsync(o => o.Status == "Pending");
                var processingOrders = await _db.Orders.CountAsync(o => o.Status == "Processing");
                var completedOrders  = await _db.Orders.CountAsync(o => o.Status == "Completed");
                var totalRevenue     = await _db.Orders
                    .Where(o => o.Status == "Completed")
                    .SumAsync(o => (decimal?)o.TotalAmount) ?? 0m;

                return Ok(new
                {
                    totalProducts,
                    totalCategories,
                    totalUsers,
                    totalOrders,
                    pendingOrders,
                    processingOrders,
                    completedOrders,
                    totalRevenue
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi tải thống kê: " + ex.Message });
            }
        }
    }
}
