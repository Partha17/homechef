import { Router, Request, Response } from "express";
import { createRedisClient } from "../config/redis";
import { PrismaClient } from "@prisma/client";

export const telegramWebhookRouter = Router();
const prisma = new PrismaClient();

/**
 * POST /api/telegram/webhook/:kitchen_id
 *
 * Single webhook endpoint for all kitchens.
 * Receives updates from Telegram, routes by kitchen_id.
 */
telegramWebhookRouter.post("/webhook/:kitchenId", async (req: Request, res: Response) => {
  const { kitchenId } = req.params;
  const update = req.body;

  // Always respond 200 quickly to Telegram
  res.sendStatus(200);

  try {
    // 1. Get kitchen config (from Redis cache or DB)
    const redis = createRedisClient();
    let kitchen: any = null;
    const cacheKey = `kitchen:${kitchenId}:config`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        kitchen = JSON.parse(cached);
      }
    } catch {
      // Redis unavailable, fall through to DB
    }

    if (!kitchen) {
      kitchen = await prisma.kitchen.findUnique({ where: { id: kitchenId } });
      if (kitchen) {
        try {
          await redis.set(cacheKey, JSON.stringify(kitchen), "EX", 3600);
        } catch {
          // Redis unavailable, skip caching
        }
      }
    }

    if (!kitchen || !kitchen.isActive || !kitchen.telegramBotToken) {
      console.warn(`[Telegram] Kitchen ${kitchenId} not found or inactive`);
      return;
    }

    // 2. Process message based on type
    const message = update.message || update.edited_message;
    const callbackQuery = update.callback_query;

    if (message?.text) {
      await handleTextMessage(kitchen, message);
    } else if (callbackQuery?.data) {
      await handleCallback(kitchen, callbackQuery);
    }
  } catch (err) {
    console.error(`[Telegram] Error processing update for ${kitchenId}:`, err);
  }
});

async function handleTextMessage(kitchen: any, message: any) {
  const chatId = message.chat.id;
  const text = message.text.trim();
  const from = message.from;

  // Register/get customer
  const customer = await getOrCreateCustomer(from, kitchen.id);

  // Simple command handler
  if (text === "/start") {
    await sendTelegramMessage(kitchen.telegramBotToken, chatId,
      `Welcome to *${kitchen.name}*! 🌸\n\n` +
      "Choose an option:\n" +
      "1️⃣ /menu - Today's Menu\n" +
      "2️⃣ /order - Place Order\n" +
      "3️⃣ /cart - View My Cart\n" +
      "4️⃣ /status - Check Status\n" +
      "Or just type what you'd like!"
    );
    return;
  }

  if (text === "/menu") {
    const items = await prisma.menuItem.findMany({
      where: { kitchenId: kitchen.id, isAvailable: true },
    });

    if (items.length === 0) {
      await sendTelegramMessage(kitchen.telegramBotToken, chatId, "No menu items available today.");
      return;
    }

    const menuText = items.map((item: any, i: number) =>
      `${i + 1}. ${item.name} — ₹${item.price}`
    ).join("\n");

    await sendTelegramMessage(kitchen.telegramBotToken, chatId,
      `*Today's Menu* 🍛:\n\n${menuText}`
    );
    return;
  }

  if (text === "/cart") {
    await showCart(kitchen, chatId, customer.id);
    return;
  }

  if (text.startsWith("/add")) {
    const parts = text.replace("/add", "").trim().split(" ");
    const qty = parseInt(parts[0]) || 1;
    const itemName = parts.slice(1).join(" ");
    await addToCartHandler(kitchen, chatId, customer.id, itemName, qty);
    return;
  }

  // Default: try to parse natural language for cart
  // Parse patterns like "2 biryani", "add 1 thali", etc.
  const addMatch = text.match(/^(?:add\s+)?(\d+)\s+(.+)$/i);
  if (addMatch) {
    const qty = parseInt(addMatch[1]);
    const itemName = addMatch[2];
    await addToCartHandler(kitchen, chatId, customer.id, itemName, qty);
    return;
  }

  if (text.toLowerCase() === "cart" || text.toLowerCase() === "my cart") {
    await showCart(kitchen, chatId, customer.id);
    return;
  }

  // Fallback: general query
  await sendTelegramMessage(kitchen.telegramBotToken, chatId,
    "I'm not sure I understood. Try:\n" +
    "• /menu - See today's menu\n" +
    "• Type \"2 biryani\" to add to cart\n" +
    "• /cart - See your cart\n" +
    "• Type \"confirm\" to place order"
  );
}

async function handleCallback(kitchen: any, callbackQuery: any) {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;

  if (data === "confirm_order") {
    await confirmOrder(kitchen, chatId, callbackQuery.from);
  } else if (data === "cancel_order") {
    // Clear cart
    const redis = createRedisClient();
    const customer = await getOrCreateCustomer(callbackQuery.from, kitchen.id);
    try {
      await redis.del(`session:${kitchen.id}:${customer.id}:cart`);
    } catch {}
    await sendTelegramMessage(kitchen.telegramBotToken, chatId, "❌ Order cancelled. Feel free to order anytime!");
  }
}

async function addToCartHandler(kitchen: any, chatId: number, customerId: string, itemName: string, qty: number) {
  // Find the menu item (case-insensitive partial match)
  const items = await prisma.menuItem.findMany({
    where: {
      kitchenId: kitchen.id,
      isAvailable: true,
      name: { contains: itemName, mode: "insensitive" },
    },
  });

  if (items.length === 0) {
    await sendTelegramMessage(kitchen.telegramBotToken, chatId,
      `Sorry, I couldn't find "${itemName}" on the menu. Try /menu to see what's available.`
    );
    return;
  }

  const item = items[0];
  const redis = createRedisClient();
  const cartKey = `session:${kitchen.id}:${customerId}:cart`;

  try {
    const existing = await redis.get(cartKey);
    const cart: any = existing ? JSON.parse(existing) : { items: [], total: 0 };

    const existingItem = cart.items.find((i: any) => i.itemId === item.id);
    if (existingItem) {
      existingItem.qty += qty;
      existingItem.lineTotal = existingItem.qty * Number(item.price);
    } else {
      cart.items.push({
        itemId: item.id,
        name: item.name,
        qty,
        unitPrice: Number(item.price),
        lineTotal: qty * Number(item.price),
      });
    }

    cart.total = cart.items.reduce((sum: number, i: any) => sum + i.lineTotal, 0);
    await redis.set(cartKey, JSON.stringify(cart), "EX", 7200);

    await sendTelegramMessage(kitchen.telegramBotToken, chatId,
      `✅ *${qty}x ${item.name}* added to your cart! (₹${cart.total} total)\n\n` +
      "Type /cart to view or say \"confirm\" to place order."
    );
  } catch (err) {
    console.error("[Cart] Redis error:", err);
    await sendTelegramMessage(kitchen.telegramBotToken, chatId, "Sorry, there was an error. Please try again.");
  }
}

async function showCart(kitchen: any, chatId: number, customerId: string) {
  const redis = createRedisClient();
  const cartKey = `session:${kitchen.id}:${customerId}:cart`;

  try {
    const data = await redis.get(cartKey);
    if (!data) {
      await sendTelegramMessage(kitchen.telegramBotToken, chatId, "🛒 Your cart is empty. Type /menu to see what's available!");
      return;
    }

    const cart = JSON.parse(data);
    const itemsText = cart.items.map((i: any) =>
      `🍛 ${i.qty}x ${i.name} — ₹${i.lineTotal}`
    ).join("\n");

    await sendTelegramMessage(kitchen.telegramBotToken, chatId,
      `*Your Cart* 🛒:\n\n${itemsText}\n\n*Total: ₹${cart.total}*\n\n` +
      "Reply \"confirm\" to place the order."
    );
  } catch (err) {
    console.error("[Cart] Redis error:", err);
    await sendTelegramMessage(kitchen.telegramBotToken, chatId, "Your cart is empty or there was an error.");
  }
}

async function confirmOrder(kitchen: any, chatId: number, from: any) {
  const customer = await getOrCreateCustomer(from, kitchen.id);
  const redis = createRedisClient();
  const cartKey = `session:${kitchen.id}:${customer.id}:cart`;

  try {
    const data = await redis.get(cartKey);
    if (!data) {
      await sendTelegramMessage(kitchen.telegramBotToken, chatId, "Your cart is empty. Add items first!");
      return;
    }

    const cart = JSON.parse(data);

    // Create order in database
    const order = await prisma.order.create({
      data: {
        kitchenId: kitchen.id,
        customerId: customer.id,
        totalAmount: cart.total,
        status: "confirmed",
        orderItems: {
          create: cart.items.map((i: any) => ({
            menuItemId: i.itemId,
            itemName: i.name,
            quantity: i.qty,
            unitPrice: i.unitPrice,
            lineTotal: i.lineTotal,
          })),
        },
      },
    });

    // Clear cart
    await redis.del(cartKey);

    const itemsText = cart.items.map((i: any) =>
      `🍛 ${i.qty}x ${i.name} — ₹${i.lineTotal}`
    ).join("\n");

    await sendTelegramMessage(kitchen.telegramBotToken, chatId,
      `✅ *Order #${order.id.slice(0, 8)} confirmed!*\n\n${itemsText}\n\n💰 *Total: ₹${cart.total}*\n\nWe'll notify you when it's ready! 🎉`
    );
  } catch (err) {
    console.error("[Order] Confirmation error:", err);
    await sendTelegramMessage(kitchen.telegramBotToken, chatId, "Sorry, there was an error confirming your order. Please try again.");
  }
}

async function getOrCreateCustomer(from: any, kitchenId: string) {
  const telegramUserId = String(from.id);
  let customer = await prisma.customer.findUnique({ where: { telegramUserId } });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        telegramUserId,
        name: from.first_name || from.username || "Telegram User",
        defaultKitchenId: kitchenId,
      },
    });
  }

  return customer;
}

async function sendTelegramMessage(botToken: string, chatId: number, text: string) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }),
    });
  } catch (err) {
    console.error("[Telegram] Send error:", err);
  }
}