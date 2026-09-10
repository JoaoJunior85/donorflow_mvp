import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetDatabase() {
  console.log('Cleaning existing database data...');

  await prisma.auditLog.deleteMany({});
  await prisma.approval.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.ledgerEntry.deleteMany({});
  await prisma.paymentRequest.deleteMany({});
  await prisma.subWallet.deleteMany({});
  await prisma.wallet.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.payee.deleteMany({});
  await prisma.organization.deleteMany({});
  await prisma.user.deleteMany({});
}

async function main() {
  await resetDatabase();

  const passwordHash = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: {
      fullName: 'System Admin',
      email: 'admin@donorflow.demo',
      phone: '+260973000003',
      passwordHash,
      role: 'admin',
    },
  });

  const donor = await prisma.user.create({
    data: {
      fullName: 'Martha Phiri',
      email: 'martha.phiri@donorflow.demo',
      phone: '+260977100001',
      passwordHash,
      role: 'donor',
    },
  });

  const recipient = await prisma.user.create({
    data: {
      fullName: 'Daniel Mwansa',
      email: 'daniel.mwansa@donorflow.demo',
      phone: '+260977100002',
      passwordHash,
      role: 'recipient',
    },
  });

  const payees = await Promise.all([
    prisma.payee.create({
      data: {
        name: 'Lusaka Conference Centre',
        type: 'vendor',
        phone: '+260977100003',
        email: 'accounts@lcc.co.zm',
        verificationStatus: 'verified',
      },
    }),
    prisma.payee.create({
      data: {
        name: 'Chikondi Catering Services',
        type: 'vendor',
        phone: '+260977100004',
        email: 'hello@chikondicatering.co.zm',
        verificationStatus: 'verified',
      },
    }),
    prisma.payee.create({
      data: {
        name: 'Mulenga Transport Services',
        type: 'vendor',
        phone: '+260977100005',
        email: 'bookings@mulengatransport.co.zm',
        verificationStatus: 'verified',
      },
    }),
  ]);

  const project = await prisma.project.create({
    data: {
      title: 'Lusaka Community Health Outreach',
      description:
        'A community health outreach programme providing maternal health education, screenings, and referrals for families in Lusaka.',
      donorId: donor.id,
      recipientId: recipient.id,
      totalBudget: 150000,
      status: 'active',
      startDate: new Date('2026-08-01'),
      endDate: new Date('2026-10-31'),
    },
  });

  const wallet = await prisma.wallet.create({
    data: {
      projectId: project.id,
      donorId: donor.id,
      recipientId: recipient.id,
      currency: 'USD',
      status: 'active',
    },
  });

  await prisma.ledgerEntry.create({
    data: {
      walletId: wallet.id,
      entryType: 'credit',
      amount: 150000,
      currency: 'USD',
      description: 'Initial funding — Lusaka Community Health Outreach',
    },
  });

  const subWallets = await Promise.all([
    prisma.subWallet.create({
      data: {
        walletId: wallet.id,
        name: 'Community Screenings',
        purpose: 'Health screenings',
        allocatedAmount: 35000,
        approvalLimit: 10000,
        status: 'active',
      },
    }),
    prisma.subWallet.create({
      data: {
        walletId: wallet.id,
        name: 'Medical Supplies',
        purpose: 'Medical supplies',
        allocatedAmount: 40000,
        approvalLimit: 12000,
        status: 'active',
      },
    }),
    prisma.subWallet.create({
      data: {
        walletId: wallet.id,
        name: 'Field Transport',
        purpose: 'Transport',
        allocatedAmount: 20000,
        approvalLimit: 5000,
        status: 'active',
      },
    }),
  ]);

  const pendingRequest = await prisma.paymentRequest.create({
    data: {
      projectId: project.id,
      subWalletId: subWallets[0].id,
      requestedBy: recipient.id,
      payeeId: payees[0].id,
      amount: 8500,
      purpose: 'Community screening venue hire',
      description: 'Venue hire for the next community screening day in Lusaka.',
      status: 'pending',
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: recipient.id,
      action: 'Payment request submitted',
      entityType: 'payment_request',
      entityId: pendingRequest.id,
      newValue: { amount: 8500, purpose: 'Community screening venue hire' },
    },
  });

  const completedRequest = await prisma.paymentRequest.create({
    data: {
      projectId: project.id,
      subWalletId: subWallets[1].id,
      requestedBy: recipient.id,
      payeeId: payees[1].id,
      amount: 12000,
      purpose: 'Community health screening kits',
      description: 'Approved purchase of screening kits for the outreach teams.',
      status: 'completed',
    },
  });

  const completedTransaction = await prisma.transaction.create({
    data: {
      paymentRequestId: completedRequest.id,
      projectId: project.id,
      subWalletId: subWallets[1].id,
      payeeId: payees[1].id,
      amount: 12000,
      transactionType: 'payment',
      status: 'completed',
      referenceNumber: 'DF-LCHO-0001',
    },
  });

  await prisma.ledgerEntry.create({
    data: {
      transactionId: completedTransaction.id,
      walletId: wallet.id,
      subWalletId: subWallets[1].id,
      entryType: 'debit',
      amount: 12000,
      currency: 'USD',
      description: 'Payment to Chikondi Catering Services: Community health screening kits',
    },
  });

  await prisma.approval.create({
    data: {
      paymentRequestId: completedRequest.id,
      approverId: donor.id,
      decision: 'approved',
      comment: 'Approved for the community health outreach programme.',
    },
  });

  console.log('\nFinal dataset is clean and focused on a single realistic project.');
  console.log('Project:', project.title);
  console.log('Donor:', donor.fullName, donor.email);
  console.log('Recipient:', recipient.fullName, recipient.email);
  console.log('Currency:', wallet.currency);
  console.log('Sub-wallets:', subWallets.map((item) => item.name).join(', '));
  console.log('Pending request:', pendingRequest.purpose, 'USD', pendingRequest.amount.toString());
  console.log('\nLogin details (password: password123):');
  console.log('Admin:', admin.email);
  console.log('Donor:', donor.email);
  console.log('Recipient:', recipient.email);
}

main()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
