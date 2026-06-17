using System;

namespace BaseCore.Entities
{
    public class StockTransactionLog
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public string TransactionType { get; set; }
        public int Quantity { get; set; }
        public int StockBefore { get; set; }
        public int StockAfter { get; set; }
        public int? ReferenceId { get; set; }
        public string Notes { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public string CreatedBy { get; set; }
        public Product Product { get; set; }
    }
}
