import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { password: { not: "" } },
  });

  console.log(`Found ${users.length} users to migrate`);

  for (const user of users) {
    const existing = await prisma.account.findFirst({
      where: { userId: user.id, providerId: "credential" },
    });

    if (existing) {
      console.log(`Skipping ${user.email} (already has credential account)`);
      continue;
    }

    await prisma.account.create({
      data: {
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: user.password,
      },
    });

    console.log(`Migrated ${user.email}`);
  }

  console.log("Done!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
