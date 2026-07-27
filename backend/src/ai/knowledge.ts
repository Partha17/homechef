// TODO: Knowledge base retrieval
// - Fetch menu items from PostgreSQL
// - Fetch kitchen info and business rules
// - Fetch customer context from PostgreSQL
// - Cache in Redis for fast path

export interface KnowledgeBase {
  menu: unknown;
  kitchenInfo: unknown;
  businessRules: unknown;
  customerContext: unknown;
}

// TODO: Implement retrieval
export async function getKnowledgeBase(
  _kitchenId: string,
  _customerId?: string
): Promise<KnowledgeBase> {
  return {
    menu: null,
    kitchenInfo: null,
    businessRules: null,
    customerContext: null,
  };
}