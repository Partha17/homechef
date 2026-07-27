// TODO: Payment tracking
// - Handle "I have paid" button
// - Store payment screenshot
// - Owner verify/dispute payment

export interface PaymentClaim {
  orderId: string;
  customerId: string;
  screenshotUrl?: string;
}

export async function claimPayment(_claim: PaymentClaim): Promise<void> {
  // Stub
}

export async function verifyPayment(orderId: string): Promise<void> {
  // Stub
}

export async function disputePayment(orderId: string): Promise<void> {
  // Stub
}