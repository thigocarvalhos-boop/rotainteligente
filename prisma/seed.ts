import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create an admin user
  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      name: 'Admin User',
      password: 'securepassword', // Make sure to hash passwords in a real application
      role: 'ADMIN',
    },
  });

  console.log({ admin });

  // Create an example project
  const project = await prisma.project.create({
    data: {
      title: 'Example Project',
      description: 'This is an example project for seeding.',
      userId: admin.id, // Associate the project with the admin user
    },
  });

  console.log({ project });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
