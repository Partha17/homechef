// TODO: Cart management in Redis
// - Add item to cart
// - Remove item from cart
// - Calculate totals
// - Clear cart on checkout

export interface CartItem {
  itemId: string;
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Cart {
  items: CartItem[];
  total: number;
  batchSlot: string | null;
}

// Stub implementations
export async function getCart(_kitchenId: string, _customerId: string): Promise<Cart | null> {
  return null;
}

export async function addToCart(
  _kitchenId: string,
  _customerId: string,
  _item: CartItem
): Promise<Cart> {
  throw new Error("Not implemented");
}

export async function removeFromCart(
  _kitchenId: string,
  _customerId: string,
  _itemId: string
): Promise<Cart> {
  throw new Error("Not implemented");
}

export async function clearCart(_kitchenId: string, _customerId: string): Promise<void> {
  // Stub
}