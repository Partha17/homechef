// TODO: Customer management
// - Register customer via Telegram
// - Get customer by telegram_user_id
// - Update preferences

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getOrCreateCustomer(
  telegramUserId: string,
  name?: string,
  phone?: string
) {
  const existing = await prisma.customer.findUnique({
    where: { telegramUserId },
  });

  if (existing) return existing;

  return prisma.customer.create({
    data: { telegramUserId, name, phone },
  });
}

export async function getCustomerById(customerId: string) {
  return prisma.customer.findUnique({
    where: { id: customerId },
    include: { orders: { take: 10, orderBy: { createdAt: "desc" } } },
  });
}