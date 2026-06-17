using System;

namespace BaseCore.Entities
{
    public class DamagedGoods
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public int Quantity { get; set; }
        public string Reason { get; set; }
        public DateTime ReportedDate { get; set; } = DateTime.Now;
        public string Notes { get; set; }
        public Product Product { get; set; }
    }
}
