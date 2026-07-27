// TODO: Order creation with dual-layer inventory locking
// - Create order + order_items in single transaction
// - Redis DECR for atomic inventory check
// - PostgreSQL SELECT ... FOR UPDATE as backstop
// - Rollback on failure

export interface CreateOrderInput {
  kitchenId: string;
  customerId: string;
  items: Array<{
    menuItemId: string;
    quantity: number;
  }>;
  batchTimeSlot: string;
  deliveryAddress?: string;
  notes?: string;
}

export async function createOrder(_input: CreateOrderInput): Promise<{ orderId: string }> {
  throw new Error("Not implemented");
}

export async function updateOrderStatus(
  _orderId: string,
  _status: string
): Promise<void> {
  // Stub
}