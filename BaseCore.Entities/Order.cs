
using System;
using System.Collections.Generic;

namespace BaseCore.Entities
{
    public class Order
    {
        public int Id { get; set; }

        public Guid UserId { get; set; }

        public DateTime OrderDate { get; set; } = DateTime.Now;

        public decimal TotalAmount { get; set; }

        public decimal ShippingFee { get; set; }

        public string PaymentMethod { get; set; } = "COD";

        // Pending → Processing (approved) → Completed | Cancelled | Rejected
        public string Status { get; set; }

        public string ShippingAddress { get; set; }

        public string? CancelReason { get; set; }

        public List<OrderDetail> OrderDetails { get; set; }
    }
}
