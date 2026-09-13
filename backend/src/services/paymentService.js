import prisma from '../lib/prisma.js';
import { createAuditLog, generateReferenceNumber } from '../lib/utils.js';
import { evaluatePaymentRequestRules, getSubWalletBalance, getSubWalletSpent } from './walletService.js';

export async function createPayee(data, userId) {
  const payee = await prisma.payee.create({
    data: {
      ...data,
      serviceProvided: data.serviceProvided?.trim() || null,
    },
  });

  await createAuditLog({
    userId,
    action: 'Payee added',
    entityType: 'payee',
    entityId: payee.id,
    newValue: { name: payee.name, type: payee.type },
  });

  return payee;
}

export async function listPayees() {
  return prisma.payee.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function verifyPayee(payeeId, status, adminId) {
  const payee = await prisma.payee.update({
    where: { id: payeeId },
    data: { verificationStatus: status },
  });

  await createAuditLog({
    userId: adminId,
    action: 'Payee verification updated',
    entityType: 'payee',
    entityId: payeeId,
    newValue: { verificationStatus: status },
  });

  return payee;
}

export async function createPaymentRequest(recipientId, data) {
  const amount = Number(data.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    const err = new Error('Payment amount must be a finite positive number');
    err.status = 400;
    throw err;
  }

  const project = await prisma.project.findFirst({
    where: { id: data.projectId, recipientId },
  });

  if (!project) {
    const err = new Error('Project not found or access denied');
    err.status = 403;
    throw err;
  }

  const subWallet = await prisma.subWallet.findUnique({
    where: { id: data.subWalletId },
    include: { wallet: true },
  });

  if (!subWallet || subWallet.wallet.projectId !== data.projectId) {
    const err = new Error('Invalid sub-wallet for this project');
    err.status = 400;
    throw err;
  }

  const payee = await prisma.payee.findUnique({ where: { id: data.payeeId } });
  if (!payee) {
    const err = new Error('Payee not found');
    err.status = 404;
    throw err;
  }

  const spent = await getSubWalletSpent(subWallet.id);
  const balance = Number(subWallet.allocatedAmount) - spent;
  const rules = evaluatePaymentRequestRules({
    amount,
    subWallet: { ...subWallet, _spent: spent },
    payee,
    invoiceUrl: data.invoiceUrl,
  });

  if (rules.blocked) {
    const err = new Error(rules.reason);
    err.status = 400;
    throw err;
  }

  const paymentRequest = await prisma.paymentRequest.create({
    data: {
      projectId: data.projectId,
      subWalletId: data.subWalletId,
      requestedBy: recipientId,
      payeeId: data.payeeId,
      amount,
      purpose: data.purpose,
      description: data.description,
      invoiceUrl: data.invoiceUrl,
      status: 'pending',
    },
    include: {
      payee: true,
      subWallet: true,
      requester: { select: { fullName: true, email: true } },
    },
  });

  await createAuditLog({
    userId: recipientId,
    action: 'Payment request submitted',
    entityType: 'payment_request',
    entityId: paymentRequest.id,
    newValue: { amount, purpose: data.purpose, flags: rules.flags },
  });

  return { ...paymentRequest, amount: Number(paymentRequest.amount) };
}

export async function listPaymentRequests(userId, role, filters = {}) {
  let where = {};

  if (role === 'donor') {
    where = { project: { donorId: userId } };
  } else if (role === 'recipient') {
    where = { requestedBy: userId };
  }

  if (filters.status) where.status = filters.status;
  if (filters.projectId) where.projectId = filters.projectId;

  const requests = await prisma.paymentRequest.findMany({
    where,
    include: {
      project: { select: { id: true, title: true } },
      subWallet: { select: { id: true, name: true, purpose: true } },
      payee: true,
      requester: { select: { id: true, fullName: true } },
      approvals: { include: { approver: { select: { fullName: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return requests.map((r) => ({ ...r, amount: Number(r.amount) }));
}

export async function getPaymentRequestById(id, userId, role) {
  const request = await prisma.paymentRequest.findUnique({
    where: { id },
    include: {
      project: { include: { donor: { select: { id: true, fullName: true } } } },
      subWallet: true,
      payee: true,
      requester: { select: { fullName: true, email: true } },
      approvals: { include: { approver: { select: { fullName: true } } } },
      transaction: true,
    },
  });

  if (!request) {
    const err = new Error('Payment request not found');
    err.status = 404;
    throw err;
  }

  if (
    role !== 'admin' &&
    request.project.donorId !== userId &&
    request.requestedBy !== userId
  ) {
    const err = new Error('Access denied');
    err.status = 403;
    throw err;
  }

  const balance = await getSubWalletBalance(request.subWallet);

  return {
    ...request,
    amount: Number(request.amount),
    subWallet: {
      ...request.subWallet,
      allocatedAmount: Number(request.subWallet.allocatedAmount),
      balance,
    },
  };
}

export async function processApproval(paymentRequestId, approverId, { decision, comment }) {
  const result = await prisma.$transaction(async (tx) => {
    const request = await tx.paymentRequest.findUnique({
    where: { id: paymentRequestId },
    include: {
      project: true,
      subWallet: { include: { wallet: true } },
      payee: true,
    },
    });

    if (!request) {
    const err = new Error('Payment request not found');
    err.status = 404;
    throw err;
    }

    if (request.project.donorId !== approverId) {
    const err = new Error('Only the project donor can approve requests');
    err.status = 403;
    throw err;
    }

    if (!['pending', 'frozen'].includes(request.status)) {
    const err = new Error(`Cannot process request with status: ${request.status}`);
    err.status = 400;
    throw err;
    }

    const approval = await tx.approval.create({
      data: { paymentRequestId, approverId, decision, comment },
    });

    let newStatus = request.status;
    if (decision === 'approved') {
      if (request.subWallet.status !== 'active' || request.subWallet.wallet.status !== 'active') {
        const err = new Error('Wallet or sub-wallet is not active');
        err.status = 400;
        throw err;
      }
      const spentResult = await tx.ledgerEntry.aggregate({
        where: { subWalletId: request.subWalletId, entryType: 'debit' },
        _sum: { amount: true },
      });
      const balance = Number(request.subWallet.allocatedAmount) - Number(spentResult._sum.amount ?? 0);
      if (balance < 0 || Number(request.amount) > balance) {
        const err = new Error('Insufficient sub-wallet balance');
        err.status = 400;
        throw err;
      }
      newStatus = 'approved';
    } else if (decision === 'rejected') {
      newStatus = 'rejected';
    } else if (decision === 'frozen') {
      newStatus = 'frozen';
    } else {
      newStatus = 'pending';
    }

    let updated = await tx.paymentRequest.update({
      where: { id: paymentRequestId },
      data: { status: newStatus },
    });

  const actionMap = {
    approved: 'Payment approved',
    rejected: 'Payment rejected',
    frozen: 'Request frozen',
    needs_more_information: 'More information requested',
  };

    await createAuditLog({
      userId: approverId,
      action: actionMap[decision] ?? 'Approval recorded',
      entityType: 'payment_request',
      entityId: paymentRequestId,
      newValue: { decision, comment },
    }, tx);

    if (decision === 'approved') {
      updated = await completePayment(updated, request, tx);
    }

    return { approval, paymentRequest: updated };
  }, { isolationLevel: 'Serializable' });

  return result;
}

async function completePayment(paymentRequest, fullRequest, tx = prisma) {
  const referenceNumber = generateReferenceNumber();

  const transaction = await tx.transaction.create({
    data: {
      paymentRequestId: paymentRequest.id,
      projectId: paymentRequest.projectId,
      subWalletId: paymentRequest.subWalletId,
      payeeId: paymentRequest.payeeId,
      amount: paymentRequest.amount,
      transactionType: 'payment',
      referenceNumber,
    },
  });

  await tx.ledgerEntry.create({
    data: {
      transactionId: transaction.id,
      walletId: fullRequest.subWallet.walletId,
      subWalletId: paymentRequest.subWalletId,
      entryType: 'debit',
      amount: paymentRequest.amount,
      currency: fullRequest.subWallet.wallet?.currency ?? 'USD',
      description: `Payment to ${fullRequest.payee.name}: ${paymentRequest.purpose}`,
    },
  });

  const completedPaymentRequest = await tx.paymentRequest.update({
    where: { id: paymentRequest.id },
    data: { status: 'completed' },
  });

  await createAuditLog({
    userId: null,
    action: 'Transaction completed',
    entityType: 'transaction',
    entityId: transaction.id,
    newValue: { referenceNumber, amount: Number(paymentRequest.amount) },
  }, tx);

  return completedPaymentRequest;
}

export async function listTransactions(userId, role, filters = {}) {
  let where = {};
  if (role === 'donor') where = { project: { donorId: userId } };
  else if (role === 'recipient') where = { project: { recipientId: userId } };

  if (filters.projectId) where.projectId = filters.projectId;

  const transactions = await prisma.transaction.findMany({
    where,
    include: {
      project: { select: { title: true } },
      subWallet: { select: { name: true } },
      payee: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return transactions.map((t) => ({ ...t, amount: Number(t.amount) }));
}
