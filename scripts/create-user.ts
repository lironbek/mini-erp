import { PrismaClient, UserRole } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hash("123456", 12);

  const user = await prisma.user.upsert({
    where: { email: "lironbek88@gmail.com" },
    update: { passwordHash, role: UserRole.ADMIN, isActive: true },
    create: {
      email: "lironbek88@gmail.com",
      passwordHash,
      name: "Liron",
      role: UserRole.ADMIN,
      preferredLanguage: "he",
      isActive: true,
    },
  });

  console.log("User created/updated:", user.email, "| Role:", user.role);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
