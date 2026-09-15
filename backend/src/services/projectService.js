import prisma from '../lib/prisma.js';
import { createAuditLog } from '../lib/utils.js';
import { publishNotification } from '../lib/notifications.js';
import { getWalletTotalsForSubWallets } from './walletService.js';
import { money, optionalDate, optionalText, requiredText } from '../lib/validation.js';

async function inSerializableTransaction(work) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(work, { isolationLevel: 'Serializable' });
    } catch (error) {
      if (error.code !== 'P2034' || attempt === 2) throw error;
    }
  }
}

export async function createProject(donorId, data) {
  const title = requiredText(data.title, 'Project title', 200);
  const description = optionalText(data.description, 'Project description', 5000);
  const totalBudget = money(data.totalBudget, 'Total budget');
  const startDate = optionalDate(data.startDate, 'Start date');
  const endDate = optionalDate(data.endDate, 'End date');
  if (startDate && endDate && endDate < startDate) {
    const error = new Error('End date cannot be before start date');
    error.status = 400;
    throw error;
  }
  if (data.recipientId) {
    const recipient = await prisma.user.findFirst({ where: { id: data.recipientId, role: 'recipient' } });
    if (!recipient) {
      const error = new Error('Selected recipient is invalid');
      error.status = 400;
      throw error;
    }
  }
  const project = await prisma.project.create({
    data: {
      title,
      description,
      donorId,
      recipientId: data.recipientId || null,
      totalBudget,
      status: 'draft',
      startDate,
      endDate,
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
  const fundingAmount = money(amount, 'Funding amount');
  const result = await inSerializableTransaction(async (tx) => {
    const project = await tx.project.findFirst({ where: { id: projectId, donorId }, include: { wallet: true } });
    if (!project) {
      const error = new Error('Project not found');
      error.status = 404;
      throw error;
    }
    const fundedAmount = project.wallet
      ? Number((await tx.ledgerEntry.aggregate({ where: { walletId: project.wallet.id, entryType: 'credit', subWalletId: null }, _sum: { amount: true } }))._sum.amount ?? 0)
      : 0;
    const remainingBudget = Number(project.totalBudget) - fundedAmount;
    if (fundingAmount > remainingBudget) {
      const error = new Error(`Funding exceeds the project budget. Maximum fundable amount is ${remainingBudget.toFixed(2)}.`);
      error.status = 400;
      throw error;
    }
    const wallet = project.wallet ?? await tx.wallet.create({ data: { projectId, donorId, recipientId: project.recipientId, currency: 'USD' } });
    await tx.ledgerEntry.create({ data: { walletId: wallet.id, entryType: 'credit', amount: fundingAmount, currency: wallet.currency, description: `Project funding: ${project.title}` } });
    await tx.project.update({ where: { id: projectId }, data: { status: 'active' } });
    await createAuditLog({ userId: donorId, action: 'Wallet funded', entityType: 'wallet', entityId: wallet.id, newValue: { amount: fundingAmount, projectId } }, tx);
    return { wallet, amount: fundingAmount, project };
  });

  if (result.project.recipientId) {
    publishNotification({
      action: 'Project funded',
      label: `Project funded: ${result.project.title} received ${result.wallet.currency} ${fundingAmount.toLocaleString()}`,
      entityType: 'wallet',
      entityId: result.wallet.id,
      recipientUserIds: [result.project.recipientId],
    });
  }

  return { wallet: result.wallet, amount: result.amount };
}

export async function createSubWallet(projectId, donorId, data) {
  const name = requiredText(data.name, 'Sub-wallet name', 150);
  const purpose = requiredText(data.purpose, 'Sub-wallet purpose', 255);
  const requestedAllocation = money(data.allocatedAmount, 'Sub-wallet allocation');
  const approvalLimit = data.approvalLimit === undefined || data.approvalLimit === null || data.approvalLimit === '' ? 0 : money(data.approvalLimit, 'Approval limit', { allowZero: true });
  if (approvalLimit > requestedAllocation) {
    const err = new Error('Approval limit cannot exceed the sub-wallet allocation');
    err.status = 400;
    throw err;
  }
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
      name,
      purpose,
      allocatedAmount: requestedAllocation,
      approvalLimit,
    },
  });

  await createAuditLog({
    userId: donorId,
    action: 'Sub-wallet created',
    entityType: 'sub_wallet',
    entityId: subWallet.id,
    newValue: { name: subWallet.name, allocatedAmount: Number(subWallet.allocatedAmount) },
  });

  if (project.recipientId) {
    publishNotification({
      action: 'New sub-wallet created',
      label: `Sub-wallet created: ${name} (${project.wallet.currency || 'USD'} ${requestedAllocation.toLocaleString()}) for ${project.title}`,
      entityType: 'sub_wallet',
      entityId: subWallet.id,
      recipientUserIds: [project.recipientId],
    });
  }

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
  const recipient = await prisma.user.findFirst({
    where: { id: recipientId, role: 'recipient' },
  });
  if (!recipient) {
    const error = new Error('Selected recipient user is invalid');
    error.status = 400;
    throw error;
  }

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

  publishNotification({
    action: 'Assigned to project',
    label: `You were assigned as recipient for project: ${project.title}`,
    entityType: 'project',
    entityId: projectId,
    recipientUserIds: [recipientId],
  });

  return project;
}
