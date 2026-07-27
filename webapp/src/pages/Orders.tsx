import { useEffect, useState } from "react";

interface OrderItem {
  id: string;
  itemName: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
}

interface Order {
  id: string;
  status: string;
  totalAmount: string;
  createdAt: string;
  customer: { name: string; telegramUserId: string };
  orderItems: OrderItem[];
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const KITCHEN_ID = "seed-kitchen-1";

  useEffect(() => {
    fetch(`/api/orders/${KITCHEN_ID}`)
      .then((r) => r.json())
      .then((data) => {
        setOrders(data.orders || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const statusColors: Record<string, string> = {
    confirmed: "#4CAF50",
    preparing: "#FF9800",
    ready: "#2196F3",
    delivered: "#9E9E9E",
    cancelled: "#f44336",
    pending: "#FFC107",
  };

  async function updateStatus(orderId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/orders/${KITCHEN_ID}/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        );
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  }

  if (loading) return <div className="page"><h1>Orders</h1><p>Loading...</p></div>;
  if (error) return <div className="page"><h1>Orders</h1><p>Error: {error}</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Orders</h1>
        <span className="badge">{orders.length} total</span>
      </div>

      {orders.length === 0 ? (
        <p className="empty-state">No orders yet. Orders from Telegram will appear here.</p>
      ) : (
        <div className="order-list">
          {orders.map((order) => (
            <div key={order.id} className="order-card">
              <div className="order-card-header" onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}>
                <div className="order-meta">
                  <strong>#{order.id.slice(0, 8)}</strong>
                  <span className="customer-name">{order.customer?.name || "Unknown"}</span>
                  <span className="order-time">{new Date(order.createdAt).toLocaleString()}</span>
                </div>
                <div className="order-summary">
                  <span className="order-total">₹{order.totalAmount}</span>
                  <span className="status-badge" style={{ backgroundColor: statusColors[order.status] || "#999" }}>
                    {order.status}
                  </span>
                  <span className="expand-icon">{expandedId === order.id ? "▲" : "▼"}</span>
                </div>
              </div>

              {expandedId === order.id && (
                <div className="order-details">
                  <table className="items-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.orderItems.map((item) => (
                        <tr key={item.id}>
                          <td>{item.itemName}</td>
                          <td>{item.quantity}</td>
                          <td>₹{item.unitPrice}</td>
                          <td>₹{item.lineTotal}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3}><strong>Total</strong></td>
                        <td><strong>₹{order.totalAmount}</strong></td>
                      </tr>
                    </tfoot>
                  </table>

                  <div className="status-actions">
                    {["confirmed", "preparing", "ready", "delivered"].map((s) => (
                      <button
                        key={s}
                        className={`status-btn ${order.status === s ? "active" : ""}`}
                        onClick={() => updateStatus(order.id, s)}
                        disabled={order.status === s}
                      >
                        {s === "confirmed" ? "✅ Confirmed" :
                         s === "preparing" ? "👩‍🍳 Preparing" :
                         s === "ready" ? "🚗 Ready" :
                         "✅ Delivered"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <style>{`
        .page { padding: 20px; max-width: 900px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
        .page-header { display: flex; justify-content: space-between; align-items: center; }
        .badge { background: #e0e0e0; padding: 4px 12px; border-radius: 12px; font-size: 14px; }
        .empty-state { color: #999; text-align: center; margin-top: 40px; }
        .order-list { display: flex; flex-direction: column; gap: 8px; }
        .order-card { border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
        .order-card-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; cursor: pointer; background: #fafafa; }
        .order-card-header:hover { background: #f0f0f0; }
        .order-meta { display: flex; flex-direction: column; gap: 2px; }
        .customer-name { font-size: 14px; color: #666; }
        .order-time { font-size: 12px; color: #999; }
        .order-summary { display: flex; align-items: center; gap: 12px; }
        .order-total { font-size: 18px; font-weight: bold; }
        .status-badge { padding: 2px 8px; border-radius: 4px; color: white; font-size: 12px; text-transform: uppercase; }
        .expand-icon { font-size: 12px; color: #999; }
        .order-details { padding: 16px; border-top: 1px solid #e0e0e0; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        .items-table th, .items-table td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #eee; }
        .items-table th { font-size: 12px; color: #666; }
        .status-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .status-btn { padding: 6px 12px; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; background: white; font-size: 12px; }
        .status-btn.active { background: #e0e0e0; border-color: #999; }
        .status-btn:disabled { opacity: 0.5; cursor: default; }
      `}</style>
    </div>
  );
}