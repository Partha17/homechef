// TODO: Menu CRUD operations
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface CreateMenuItemInput {
  kitchenId: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  maxDailyQty: number;
  batchTimeSlots: string[];
}

export interface UpdateMenuItemInput {
  name?: string;
  description?: string;
  category?: string;
  price?: number;
  isAvailable?: boolean;
  maxDailyQty?: number;
  batchTimeSlots?: string[];
}

export async function getMenuByKitchen(kitchenId: string, includeUnavailable = false) {
  const where: any = { kitchenId };
  if (!includeUnavailable) {
    where.isAvailable = true;
  }
  return prisma.menuItem.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
}

export async function createMenuItem(data: CreateMenuItemInput) {
  return prisma.menuItem.create({ data });
}

export async function updateMenuItem(itemId: string, data: UpdateMenuItemInput) {
  return prisma.menuItem.update({
    where: { id: itemId },
    data,
  });
}

export async function deleteMenuItem(itemId: string) {
  return prisma.menuItem.update({
    where: { id: itemId },
    data: { isAvailable: false },
  });
}