// TODO: Three-layer memory architecture
// - Layer 1: In-memory (LangChain conversation buffer)
// - Layer 2: Redis (TTL-based session persistence)
// - Layer 3: PostgreSQL (long-term customer context)

export interface SessionData {
  conversationHistory: Array<{ role: string; content: string }>;
  cart: {
    items: Array<{
      itemId: string;
      name: string;
      qty: number;
      unitPrice: number;
      lineTotal: number;
    }>;
    total: number;
    batchSlot: string | null;
  } | null;
}

// TODO: Implement Redis-backed session store
export async function getSession(
  _kitchenId: string,
  _customerId: string
): Promise<SessionData | null> {
  return null;
}

export async function saveSession(
  _kitchenId: string,
  _customerId: string,
  _data: SessionData
): Promise<void> {
  // Stub
}

export async function clearSession(
  _kitchenId: string,
  _customerId: string
): Promise<void> {
  // Stub
}