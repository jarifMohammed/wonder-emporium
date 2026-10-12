import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedAdmin() {
  const email = process.env.ADMIN_SEED_EMAIL || 'admin@gmail.com';
  const password = process.env.ADMIN_SEED_PASSWORD || 'Pa$$w0rd1';
  const username = process.env.ADMIN_SEED_USERNAME || 'admin';
  const firstName = process.env.ADMIN_SEED_FIRST_NAME || 'Admin';
  const lastName = process.env.ADMIN_SEED_LAST_NAME || 'User';
  const role = (process.env.ADMIN_SEED_ROLE as UserRole) || UserRole.ADMIN;

  console.log(`Checking admin account for: ${email}...`);

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.authUser.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      role,
      verified: true,
      status: UserStatus.ACTIVE,
    },
    create: {
      email,
      password: hashedPassword,
      username,
      role,
      verified: true,
      status: UserStatus.ACTIVE,
      isFoundingAuthor: false,
    },
  });

  await prisma.userProfile.upsert({
    where: { authId: user.id },
    update: {
      firstName,
      lastName,
    },
    create: {
      authId: user.id,
      firstName,
      lastName,
    },
  });

  await prisma.authSecurity.upsert({
    where: { authId: user.id },
    update: {
      failedAttempts: 0,
      lockExpiresAt: null,
    },
    create: {
      authId: user.id,
      failedAttempts: 0,
      mfaEnabled: false,
    },
  });

  console.log('✅ Admin user successfully created/updated:');
  console.log(`   ID:       ${user.id}`);
  console.log(`   Email:    ${user.email}`);
  console.log(`   Username: ${user.username}`);
  console.log(`   Role:     ${user.role}`);
  console.log(`   Verified: ${user.verified}`);
  console.log(`   Status:   ${user.status}`);
  console.log(`   Password: ${password}`);
}

seedAdmin()
  .catch((error) => {
    console.error('❌ Error seeding admin user:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
