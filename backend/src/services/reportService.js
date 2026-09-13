import prisma from '../lib/prisma.js';
import { getSubWalletSpentByIds, getWalletTotalsForSubWallets } from './walletService.js';

export async function getDonorDashboard(userId) {
  const projects = await prisma.project.findMany({
    where: { donorId: userId },
    include: { wallet: { include: { subWallets: true } } },
  });

  const subWalletIds = projects.flatMap((project) => project.wallet?.subWallets.map((sw) => sw.id) ?? []);
  const [walletTotals, pendingApprovals, spentBySubWallet] = await Promise.all([
    Promise.all(projects.filter((project) => project.wallet).map((project) => getWalletTotalsForSubWallets(project.wallet.id, project.wallet.subWallets))),
    prisma.paymentRequest.count({ where: { project: { donorId: userId }, status: 'pending' } }),
    getSubWalletSpentByIds(subWalletIds),
  ]);
  const totalDonated = walletTotals.reduce((sum, totals) => sum + totals.funded, 0);
  const totalSpent = walletTotals.reduce((sum, totals) => sum + totals.spent, 0);

  const recentTransactions = await prisma.transaction.findMany({
    where: { project: { donorId: userId } },
    include: {
      project: { select: { title: true } },
      subWallet: { select: { name: true } },
      payee: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  const spendingByCategory = projects.flatMap((project) =>
    project.wallet?.subWallets.flatMap((sw) => {
      const spent = spentBySubWallet.get(sw.id) ?? 0;
      return spent > 0 ? [{ name: sw.name, value: spent }] : [];
    }) ?? []
  );

  const subWalletReports = projects.flatMap((project) =>
    project.wallet?.subWallets.map((sw) => {
      const spent = spentBySubWallet.get(sw.id) ?? 0;
      const allocated = Number(sw.allocatedAmount);
      return {
        id: sw.id,
        name: sw.name,
        purpose: sw.purpose,
        allocated,
        spent,
        remaining: allocated - spent,
      };
    }) ?? []
  );

  return {
    totalDonated,
    totalSpent,
    remainingBalance: totalDonated - totalSpent,
    activeProjects: projects.filter((p) => p.status === 'active').length,
    pendingApprovals,
    recentTransactions: recentTransactions.map((t) => ({
      ...t,
      amount: Number(t.amount),
    })),
    spendingByCategory,
    subWalletReports,
    projects: projects.length,
  };
}

export async function getRecipientDashboard(userId) {
  const projects = await prisma.project.findMany({
    where: { recipientId: userId, status: 'active' },
    include: { wallet: { include: { subWallets: true } } },
  });

  const subWalletIds = projects.flatMap((project) => project.wallet?.subWallets.map((sw) => sw.id) ?? []);
  const spentBySubWallet = await getSubWalletSpentByIds(subWalletIds);
  const subWallets = [];
  for (const p of projects) {
    if (!p.wallet) continue;
    for (const sw of p.wallet.subWallets) {
      const spent = spentBySubWallet.get(sw.id) ?? 0;
      subWallets.push({
        projectTitle: p.title,
        projectId: p.id,
        id: sw.id,
        name: sw.name,
        purpose: sw.purpose,
        allocatedAmount: Number(sw.allocatedAmount),
        spent,
        balance: Number(sw.allocatedAmount) - spent,
        status: sw.status,
      });
    }
  }

  const paymentRequests = await prisma.paymentRequest.findMany({
    where: { requestedBy: userId },
    include: {
      project: { select: { title: true } },
      payee: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  return {
    assignedProjects: projects.length,
    subWallets,
    paymentRequests: paymentRequests.map((pr) => ({
      ...pr,
      amount: Number(pr.amount),
    })),
    pendingCount: paymentRequests.filter((pr) => pr.status === 'pending').length,
    approvedCount: paymentRequests.filter((pr) => pr.status === 'completed').length,
    rejectedCount: paymentRequests.filter((pr) => pr.status === 'rejected').length,
  };
}

export async function getAdminDashboard() {
  const [users, organizations, projects, flaggedRequests, auditLogs] = await Promise.all([
    prisma.user.count(),
    prisma.organization.count(),
    prisma.project.count(),
    prisma.paymentRequest.count({
      where: { status: 'frozen' },
    }),
    prisma.auditLog.findMany({
      include: { user: { select: { fullName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ]);

  const pendingPayees = await prisma.payee.count({
    where: { verificationStatus: 'pending' },
  });

  return { users, organizations, projects, flaggedRequests, pendingPayees, auditLogs };
}

export async function getProjectReport(projectId, userId, role) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      wallet: { include: { subWallets: true } },
      transactions: { include: { payee: true, subWallet: true } },
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
  const subWalletReports = [];

  if (project.wallet) {
    for (const sw of project.wallet.subWallets) {
      const spent = totals.spentBySubWallet.get(sw.id) ?? 0;
      subWalletReports.push({
        id: sw.id,
        name: sw.name,
        purpose: sw.purpose,
        allocated: Number(sw.allocatedAmount),
        spent,
        remaining: Number(sw.allocatedAmount) - spent,
      });
    }
  }

  const payeeMap = {};
  for (const t of project.transactions) {
    const key = t.payee.name;
    payeeMap[key] = (payeeMap[key] ?? 0) + Number(t.amount);
  }

  const payeeReport = Object.entries(payeeMap).map(([name, total]) => ({ name, total }));
  const safeTotals = totals
    ? {
        funded: totals.funded,
        allocated: totals.allocated,
        spent: totals.spent,
        remaining: totals.remaining,
      }
    : null;

  return {
    project: { id: project.id, title: project.title, totalBudget: Number(project.totalBudget) },
    totals: safeTotals,
    subWalletReports,
    payeeReport,
    transactionCount: project.transactions.length,
  };
}

export async function getNotifications(userId, role) {
  if (role === 'donor') {
    const requests = await prisma.paymentRequest.findMany({
      where: { project: { donorId: userId } },
      include: {
        payee: { select: { name: true } },
        project: { select: { title: true } },
        requester: { select: { fullName: true } },
        approvals: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
      take: 12,
    });

    return requests.map((request) => ({
      id: `pr-${request.id}-${request.status}`,
      title: request.status === 'pending' ? 'New payment request' : 'Payment request updated',
      label: `${request.requester?.fullName ?? 'Recipient'} · ${request.project?.title ?? 'Project'} · ${request.purpose} · ${Number(request.amount).toLocaleString()}`,
      to: '/approvals',
      createdAt: request.approvals[0]?.createdAt ?? request.createdAt,
      status: request.status,
    }));
  }

  if (role === 'recipient') {
    const requests = await prisma.paymentRequest.findMany({
      where: { requestedBy: userId },
      include: {
        payee: { select: { name: true } },
        project: { select: { title: true } },
        approvals: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
      take: 12,
    });

    const statusTitles = {
      pending: 'Awaiting donor review',
      completed: 'Payment completed',
      rejected: 'Payment rejected',
      frozen: 'Payment request frozen',
    };
    return requests.map((request) => ({
      id: `pr-${request.id}-${request.status}`,
      title: statusTitles[request.status] ?? 'Payment request updated',
      label: `${request.project?.title ?? 'Project'} · ${request.purpose} · ${Number(request.amount).toLocaleString()}`,
      to: '/payment-requests',
      createdAt: request.approvals[0]?.createdAt ?? request.createdAt,
      status: request.status,
    }));
  }

  const logs = await prisma.auditLog.findMany({
    include: { user: { select: { fullName: true } } },
    orderBy: { createdAt: 'desc' },
    take: 15,
  });

  return logs.map((log) => ({
    id: log.id,
    label: `${log.action}${log.user?.fullName ? ` · ${log.user.fullName}` : ''}`,
    to: '/audit-logs',
    createdAt: log.createdAt,
  }));
}

export async function getAuditLogs(limit = 50) {
  return prisma.auditLog.findMany({
    include: { user: { select: { fullName: true, email: true, role: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function listUsers() {
  return prisma.user.findMany({
    select: { id: true, fullName: true, email: true, phone: true, role: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function listOrganizations() {
  return prisma.organization.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function createOrganization(data) {
  return prisma.organization.create({ data });
}
