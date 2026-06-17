using System;

namespace BaseCore.Entities
{
    public class WarehouseReceipt
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public int Quantity { get; set; }
        public decimal UnitCost { get; set; }
        public decimal TotalCost { get; set; }
        public string Supplier { get; set; }
        public DateTime ReceivedDate { get; set; } = DateTime.Now;
        public string Notes { get; set; }
        public string CreatedBy { get; set; }
        public Product Product { get; set; }
    }
}
