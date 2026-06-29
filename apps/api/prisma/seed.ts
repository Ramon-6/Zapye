import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";

const prisma = new PrismaClient();

async function main() {
  const restaurant = await prisma.restaurant.create({
    data: {
      name: "Burger do Zé",
      slug: "burger-do-ze",
      settings: {
        create: {
          addressLine: "Rua das Palmeiras, 123 - Centro",
          pixKey: "burger@ze.com.br",
          pixKeyName: "José Lanches ME",
          avgDeliveryMin: 40,
          minOrderValue: 20,
          greetingMessage: "Bem-vindo à Burger do Zé! 🍔",
          aiEnabled: true,
        },
      },
      deliveryZones: {
        create: [
          { neighborhood: "Centro", fee: 5, avgMinutes: 30 },
          { neighborhood: "Jardim América", fee: 8, avgMinutes: 45 },
        ],
      },
    },
  });

  await prisma.user.create({
    data: {
      name: "José",
      email: "ze@burger.com",
      passwordHash: createHash("sha256").update("zapye123").digest("hex"),
      role: "OWNER",
      restaurantId: restaurant.id,
    },
  });

  const lanches = await prisma.menuCategory.create({
    data: { restaurantId: restaurant.id, name: "Lanches", sortOrder: 1 },
  });
  const bebidas = await prisma.menuCategory.create({
    data: { restaurantId: restaurant.id, name: "Bebidas", sortOrder: 2 },
  });

  const xburger = await prisma.product.create({
    data: {
      restaurantId: restaurant.id, categoryId: lanches.id, name: "X-Burger",
      description: "Pão, hambúrguer 120g, queijo, alface e tomate",
      ingredients: "pão, carne, queijo, alface, tomate", basePrice: 22,
      addons: { create: [
        { name: "Bacon", price: 4 },
        { name: "Ovo", price: 3 },
        { name: "Cheddar extra", price: 4 },
      ] },
    },
  });

  await prisma.product.create({
    data: { restaurantId: restaurant.id, categoryId: bebidas.id, name: "Coca-Cola Lata", basePrice: 6 },
  });

  console.log("Seed pronto:", { restaurant: restaurant.slug, xburger: xburger.name });
}

main().finally(() => prisma.$disconnect());
