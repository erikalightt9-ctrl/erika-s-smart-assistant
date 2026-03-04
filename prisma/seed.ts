import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding AILE database...");

  // Create users
  const users = [
    {
      email: "erika@gdscapital.com",
      password: "ErikaOS@2024",
      name: "Erika Hernando",
      role: Role.ERIKA,
    },
    {
      email: "admin@gdscapital.com",
      password: "Admin@2024",
      name: "System Admin",
      role: Role.ADMIN,
    },
    {
      email: "ceo@gdscapital.com",
      password: "CEO@2024",
      name: "CEO — GDS Capital",
      role: Role.EXEC,
    },
    {
      email: "vp@gdscapital.com",
      password: "VP@2024",
      name: "VP Operations",
      role: Role.EXEC,
    },
    {
      email: "staff1@gdscapital.com",
      password: "Staff@2024",
      name: "Juan Dela Cruz",
      role: Role.STAFF,
    },
    {
      email: "staff2@gdscapital.com",
      password: "Staff@2024",
      name: "Maria Reyes",
      role: Role.STAFF,
    },
  ];

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 12);
    await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash, isActive: true },
      create: {
        email: u.email,
        passwordHash,
        name: u.name,
        role: u.role,
      },
    });
    console.log(`  ✓ User: ${u.email} (${u.role})`);
  }

  console.log("✅ Seeding complete!");
  console.log("\n🔑 Login credentials:");
  console.log("  Erika (full access): erika@gdscapital.com / ErikaOS@2024");
  console.log("  Admin:               admin@gdscapital.com / Admin@2024");
  console.log("  CEO (exec):          ceo@gdscapital.com   / CEO@2024");
  console.log("  Staff:               staff1@gdscapital.com / Staff@2024");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
