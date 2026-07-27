export type Intent =
  | "menu_query"
  | "cart_add"
  | "cart_remove"
  | "cart_checkout"
  | "order_status"
  | "timing_query"
  | "availability"
  | "pricing"
  | "general"
  | "complaint"
  | "modify_order"
  | "unknown";

// TODO: Implement intent classification using LangChain
export function classifyIntent(_message: string): Intent {
  return "unknown";
}