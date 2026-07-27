import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create a sample kitchen
  const kitchen = await prisma.kitchen.upsert({
    where: { id: "seed-kitchen-1" },
    update: {},
    create: {
      id: "seed-kitchen-1",
      name: "Priya's Kitchen",
      ownerName: "Priya Sharma",
      phone: "+919876543210",
      address: "A-101, Sunshine Apartments, Koramangala, Bangalore",
      lat: 12.9352,
      lng: 77.6245,
      deliveryRadiusKm: 5,
      telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
      upiId: "priya@paytm",
      isActive: true,
    },
  });
  console.log(`Kitchen: ${kitchen.name} (${kitchen.id})`);

  // Create sample menu items
  const menuItems = [
    {
      id: "item-biryani",
      name: "Chicken Biryani",
      description: "Fragrant basmati rice with tender chicken, aromatic spices",
      category: "lunch",
      price: 180,
      maxDailyQty: 20,
      batchTimeSlots: ["lunch", "dinner"],
    },
    {
      id: "item-thali",
      name: "Veg Thali",
      description: "Complete meal with dal, sabzi, roti, rice, and salad",
      category: "lunch",
      price: 150,
      maxDailyQty: 15,
      batchTimeSlots: ["lunch"],
    },
    {
      id: "item-dal",
      name: "Dal Makhani + Roti",
      description: "Creamy black lentils cooked overnight with butter",
      category: "dinner",
      price: 120,
      maxDailyQty: 25,
      batchTimeSlots: ["lunch", "dinner"],
    },
    {
      id: "item-poha",
      name: "Poha",
      description: "Flattened rice with peanuts, lemon, and fresh coriander",
      category: "breakfast",
      price: 50,
      maxDailyQty: 30,
      batchTimeSlots: ["breakfast"],
    },
    {
      id: "item-dosa",
      name: "Masala Dosa",
      description: "Crispy fermented crepe with spiced potato filling",
      category: "breakfast",
      price: 80,
      maxDailyQty: 20,
      batchTimeSlots: ["breakfast"],
    },
  ];

  for (const item of menuItems) {
    await prisma.menuItem.upsert({
      where: { id: item.id },
      update: { price: item.price, isAvailable: true },
      create: {
        ...item,
        kitchenId: kitchen.id,
      },
    });
  }
  console.log(`Menu items: ${menuItems.length} created`);

  console.log("\n✅ Seed complete! You can now:");
  console.log(`   - Test menu API: curl http://localhost:3000/api/menu/${kitchen.id}`);
  console.log(`   - Configure Telegram webhook in .env (TELEGRAM_BOT_TOKEN)`);
  console.log(`   - Start ngrok: ngrok http 3000`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });