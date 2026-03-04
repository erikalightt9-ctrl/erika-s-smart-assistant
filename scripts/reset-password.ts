/**
 * One-time script to reset the ERIKA super admin password.
 * Run with: npx tsx scripts/reset-password.ts
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const TARGET_EMAIL = "erika@gdscapital.com";
const NEW_PASSWORD = "ErikaOS@2024";

async function main() {
  const passwordHash = await bcrypt.hash(NEW_PASSWORD, 12);

  const user = await prisma.user.update({
    where: { email: TARGET_EMAIL },
    data: { passwordHash, isActive: true },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });

  console.log("✅ Password reset successfully!");
  console.log("   Email:    ", user.email);
  console.log("   Name:     ", user.name);
  console.log("   Role:     ", user.role);
  console.log("   Active:   ", user.isActive);
  console.log("\n🔑 New credentials:");
  console.log("   Email:    ", TARGET_EMAIL);
  console.log("   Password: ", NEW_PASSWORD);
}

main()
  .catch((e) => { console.error("❌ Error:", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
