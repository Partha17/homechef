// TODO: Rating and feedback
// - Submit rating
// - Categorize complaints
// - Get rating analytics

export interface CreateRatingInput {
  orderId: string;
  customerId: string;
  kitchenId: string;
  score: number;
  complaintCategory?: string;
  complaintText?: string;
}

export async function createRating(_input: CreateRatingInput): Promise<void> {
  // Stub
}

export async function getRatingSummary(kitchenId: string) {
  // Stub
  return { average: 0, distribution: {}, topComplaints: [] };
}