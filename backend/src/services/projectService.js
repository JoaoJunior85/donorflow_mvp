import prisma from '../lib/prisma.js';
import { createAuditLog } from '../lib/utils.js';
import { getWalletTotalsForSubWallets } from './walletService.js';

export async function createProject(donorId, data) {
  const project = await prisma.project.create({
    data: {
      title: data.title,
      description: data.description,
      donorId,
      recipientId: data.recipientId || null,
      totalBudget: data.totalBudget,
      status: data.status ?? 'draft',
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
    },
    include: {
      donor: { select: { id: true, fullName: true, email: true } },
      recipient: { select: { id: true, fullName: true, email: true } },
    },
  });

  await createAuditLog({
    userId: donorId,
    action: 'Project created',
    entityType: 'project',
    entityId: project.id,
    newValue: { title: project.title, totalBudget: Number(project.totalBudget) },
  });

  return project;
}

export async function fundProject(projectId, donorId, amount) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, donorId },
    include: { wallet: true },
  });

  if (!project) {
    const err = new Error('Project not found');
    err.status = 404;
    throw err;
  }

  let wallet = project.wallet;
  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: {
        projectId,
        donorId,
        recipientId: project.recipientId,
        currency: 'USD',
      },
    });
  }

  await prisma.ledgerEntry.create({
    data: {
      walletId: wallet.id,
      entryType: 'credit',
      amount,
      currency: wallet.currency,
      description: `Project funding: ${project.title}`,
    },
  });

  await prisma.project.update({
    where: { id: projectId },
    data: { status: 'active' },
  });

  await createAuditLog({
    userId: donorId,
    action: 'Wallet funded',
    entityType: 'wallet',
    entityId: wallet.id,
    newValue: { amount: Number(amount), projectId },
  });

  return { wallet, amount: Number(amount) };
}

export async function createSubWallet(projectId, donorId, data) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, donorId },
    include: {
      wallet: {
        include: { subWallets: true },
      },
    },
  });

  if (!project?.wallet) {
    const err = new Error('Project wallet not found — fund the project first');
    err.status = 400;
    throw err;
  }

  const fundedAmount = Number(
    (await prisma.ledgerEntry.aggregate({
      where: { walletId: project.wallet.id, entryType: 'credit', subWalletId: null },
      _sum: { amount: true },
    }))._sum.amount ?? 0
  );

  const existingAllocation = project.wallet.subWallets.reduce(
    (sum, sw) => sum + Number(sw.allocatedAmount),
    0
  );
  const requestedAllocation = Number(data.allocatedAmount);
  const availableBalance = Math.max(0, fundedAmount - existingAllocation);

  if (requestedAllocation > availableBalance) {
    const err = new Error(
      `Sub-wallet allocation exceeds available project wallet balance. Available: ${availableBalance.toFixed(2)}. Requested total allocation: ${requestedAllocation.toFixed(2)}.`
    );
    err.status = 400;
    throw err;
  }

  const subWallet = await prisma.subWallet.create({
    data: {
      walletId: project.wallet.id,
      name: data.name,
      purpose: data.purpose,
      allocatedAmount: data.allocatedAmount,
      approvalLimit: data.approvalLimit ?? null,
    },
  });

  await createAuditLog({
    userId: donorId,
    action: 'Sub-wallet created',
    entityType: 'sub_wallet',
    entityId: subWallet.id,
    newValue: { name: subWallet.name, allocatedAmount: Number(subWallet.allocatedAmount) },
  });

  return subWallet;
}

export async function getProjectsForUser(userId, role) {
  const where =
    role === 'admin'
      ? {}
      : role === 'donor'
        ? { donorId: userId }
        : { recipientId: userId };

  const projects = await prisma.project.findMany({
    where,
    include: {
      donor: { select: { id: true, fullName: true, email: true } },
      recipient: { select: { id: true, fullName: true, email: true } },
      wallet: { include: { subWallets: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return Promise.all(
    projects.map(async (p) => {
      const totals = p.wallet ? await getWalletTotalsForSubWallets(p.wallet.id, p.wallet.subWallets) : null;
      const subWallets = p.wallet
        ? p.wallet.subWallets.map((sw) => {
            const spent = totals.spentBySubWallet.get(sw.id) ?? 0;
            return {
              ...sw,
              allocatedAmount: Number(sw.allocatedAmount),
              approvalLimit: sw.approvalLimit ? Number(sw.approvalLimit) : null,
              spent,
              balance: Number(sw.allocatedAmount) - spent,
            };
          })
        : [];

      return {
        ...p,
        totalBudget: Number(p.totalBudget),
        wallet: p.wallet ? { ...p.wallet, totals: { ...totals, spentBySubWallet: undefined }, subWallets } : null,
      };
    })
  );
}

export async function getProjectById(projectId, userId, role) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      donor: { select: { id: true, fullName: true, email: true } },
      recipient: { select: { id: true, fullName: true, email: true } },
      wallet: { include: { subWallets: true } },
      paymentRequests: {
        include: {
          payee: true,
          requester: { select: { id: true, fullName: true } },
          approvals: { include: { approver: { select: { fullName: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      },
      transactions: {
        include: { payee: true, subWallet: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!project) {
    const err = new Error('Project not found');
    err.status = 404;
    throw err;
  }

  if (role !== 'admin' && project.donorId !== userId && project.recipientId !== userId) {
    const err = new Error('Access denied');
    err.status = 403;
    throw err;
  }

  const totals = project.wallet
    ? await getWalletTotalsForSubWallets(project.wallet.id, project.wallet.subWallets)
    : null;
  const subWallets = project.wallet
    ? project.wallet.subWallets.map((sw) => {
        const spent = totals.spentBySubWallet.get(sw.id) ?? 0;
        return {
          ...sw,
          allocatedAmount: Number(sw.allocatedAmount),
          approvalLimit: sw.approvalLimit ? Number(sw.approvalLimit) : null,
          spent,
          balance: Number(sw.allocatedAmount) - spent,
        };
      })
    : [];

  return {
    ...project,
    totalBudget: Number(project.totalBudget),
    wallet: project.wallet
      ? { ...project.wallet, totals: { ...totals, spentBySubWallet: undefined }, subWallets }
      : null,
    paymentRequests: project.paymentRequests.map((pr) => ({
      ...pr,
      amount: Number(pr.amount),
    })),
    transactions: project.transactions.map((t) => ({
      ...t,
      amount: Number(t.amount),
    })),
  };
}

export async function assignRecipient(projectId, donorId, recipientId) {
  const project = await prisma.project.update({
    where: { id: projectId, donorId },
    data: { recipientId },
    include: { recipient: { select: { id: true, fullName: true, email: true } } },
  });

  const wallet = await prisma.wallet.findUnique({ where: { projectId } });
  if (wallet) {
    await prisma.wallet.update({
      where: { id: wallet.id },
      data: { recipientId },
    });
  }

  await createAuditLog({
    userId: donorId,
    action: 'Recipient assigned',
    entityType: 'project',
    entityId: projectId,
    newValue: { recipientId },
  });

  return project;
}
