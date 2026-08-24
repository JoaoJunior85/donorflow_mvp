import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function findOrCreateUser(data) {
  const existing = await prisma.user.findFirst({ where: { email: data.email } });
  if (existing) return existing;
  return prisma.user.create({ data });
}

async function main() {
  console.log('Seeding DonorFlow demo data...');

  const passwordHash = await bcrypt.hash('password123', 10);

  const donor = await findOrCreateUser({
      fullName: 'Grace Mwanza',
      email: 'donor@donorflow.demo',
      phone: '+260971000001',
      passwordHash,
      role: 'donor',
  });

  const recipient = await findOrCreateUser({
      fullName: 'James Banda',
      email: 'recipient@donorflow.demo',
      phone: '+260972000002',
      passwordHash,
      role: 'recipient',
  });

  const admin = await findOrCreateUser({
      fullName: 'System Admin',
      email: 'admin@donorflow.demo',
      phone: '+260973000003',
      passwordHash,
      role: 'admin',
  });

  let payee = await prisma.payee.findFirst({ where: { name: 'ABC Printers' } });
  if (!payee) {
    payee = await prisma.payee.create({
      data: {
      name: 'ABC Printers',
      type: 'vendor',
      phone: '+260974000004',
      email: 'info@abcprinters.co.zm',
      bankName: 'Zanaco',
      bankAccountNumber: '1234567890',
      verificationStatus: 'verified',
      },
    });
  }

  const venuePayee = await prisma.payee.findFirst({ where: { name: 'Lusaka Venue Hub' } });
  if (!venuePayee) {
    await prisma.payee.create({
      data: {
        name: 'Lusaka Venue Hub',
        type: 'vendor',
        phone: '+260975000005',
        verificationStatus: 'verified',
      },
    });
  }

  const organization = await prisma.organization.findFirst({
    where: { name: 'Youth Empowerment Foundation' },
  });
  if (!organization) {
    await prisma.organization.create({
      data: {
        name: 'Youth Empowerment Foundation',
        type: 'NGO',
        registrationNumber: 'NGO/2024/001',
        email: 'contact@yef.org.zm',
        verificationStatus: 'verified',
      },
    });
  }

  let project = await prisma.project.findFirst({
    where: { title: 'Digital Skills Training Programme' },
  });

  if (!project) {
    project = await prisma.project.create({
      data: {
        title: 'Digital Skills Training Programme',
        description:
          'A 6-week digital literacy programme for 50 youth in Lusaka, covering basic computing, online safety, and job-ready skills.',
        donorId: donor.id,
        recipientId: recipient.id,
        totalBudget: 100000,
        status: 'active',
        startDate: new Date('2026-07-01'),
        endDate: new Date('2026-08-31'),
      },
    });
  }

  let wallet = await prisma.wallet.findUnique({ where: { projectId: project.id } });

  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: {
        projectId: project.id,
        donorId: donor.id,
        recipientId: recipient.id,
        currency: 'MZN',
      },
    });

    await prisma.ledgerEntry.create({
      data: {
        walletId: wallet.id,
        entryType: 'credit',
        amount: 100000,
        currency: 'MZN',
        description: 'Initial project funding — Digital Skills Training',
      },
    });
  }

  const subWalletDefs = [
    { name: 'Venue Wallet', purpose: 'Venue', allocatedAmount: 20000, approvalLimit: 5000 },
    { name: 'Training Materials', purpose: 'Training Materials', allocatedAmount: 30000, approvalLimit: 8000 },
    { name: 'Facilitators', purpose: 'Labour', allocatedAmount: 25000, approvalLimit: 10000 },
    { name: 'Meals', purpose: 'Meals', allocatedAmount: 15000, approvalLimit: 3000 },
    { name: 'Transport', purpose: 'Transport', allocatedAmount: 10000, approvalLimit: 2000 },
  ];

  const existingSubWallets = await prisma.subWallet.count({ where: { walletId: wallet.id } });

  if (existingSubWallets === 0) {
    for (const sw of subWalletDefs) {
      await prisma.subWallet.create({
        data: { walletId: wallet.id, ...sw },
      });
    }
  }

  const trainingMaterials = await prisma.subWallet.findFirst({
    where: { walletId: wallet.id, name: 'Training Materials' },
  });

  const existingRequest = await prisma.paymentRequest.findFirst({
    where: { projectId: project.id, purpose: { contains: 'training manuals' } },
  });

  if (!existingRequest && trainingMaterials) {
    const paymentRequest = await prisma.paymentRequest.create({
      data: {
        projectId: project.id,
        subWalletId: trainingMaterials.id,
        requestedBy: recipient.id,
        payeeId: payee.id,
        amount: 8000,
        purpose: 'Payment for training manuals',
        description: 'Printing 50 copies of digital skills training manuals for programme participants.',
        status: 'pending',
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: recipient.id,
        action: 'Payment request submitted',
        entityType: 'payment_request',
        entityId: paymentRequest.id,
        newValue: { amount: 8000, purpose: 'training manuals' },
      },
    });
  }

  console.log('\nDemo accounts (password: password123):');
  console.log('  Donor:     donor@donorflow.demo');
  console.log('  Recipient: recipient@donorflow.demo');
  console.log('  Admin:     admin@donorflow.demo');
  console.log('\nSeed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
