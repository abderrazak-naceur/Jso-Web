namespace JSO.Domain;

// A single line of a fan shop Order. ProductName and UnitPrice are snapshotted
// at order time so historical orders stay correct even if the product changes
// or is deleted later. LineTotal = UnitPrice * Quantity.
public sealed class OrderItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrderId { get; set; }
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = null!;
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
    public decimal LineTotal { get; set; }
}
