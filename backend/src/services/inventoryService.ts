// TODO: Dual-layer inventory locking
// - Redis DECR for atomic reservation
// - PostgreSQL SELECT ... FOR UPDATE as backstop
// - Rollback with INCR if transaction fails

export interface InventoryReservation {
  itemId: string;
  qty: number;
  batchSlot: string;
}

export async function reserveInventory(
  _kitchenId: string,
  _items: InventoryReservation[]
): Promise<boolean> {
  throw new Error("Not implemented");
}

export async function releaseInventory(
  _kitchenId: string,
  _items: InventoryReservation[]
): Promise<void> {
  // Stub
}