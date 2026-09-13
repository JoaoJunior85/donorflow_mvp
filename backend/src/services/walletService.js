import prisma from '../lib/prisma.js';

export async function getSubWalletSpent(subWalletId) {
  const result = await prisma.ledgerEntry.aggregate({
    where: { subWalletId, entryType: 'debit' },
    _sum: { amount: true },
  });
  return Number(result._sum.amount ?? 0);
}

export async function getSubWalletSpentByIds(subWalletIds) {
  if (!subWalletIds.length) return new Map();

  const results = await prisma.ledgerEntry.groupBy({
    by: ['subWalletId'],
    where: { subWalletId: { in: subWalletIds }, entryType: 'debit' },
    _sum: { amount: true },
  });

  return new Map(results.map((result) => [result.subWalletId, Number(result._sum.amount ?? 0)]));
}

export async function getSubWalletBalance(subWallet) {
  const spent = await getSubWalletSpent(subWallet.id);
  return Number(subWallet.allocatedAmount) - spent;
}

export async function getWalletTotals(walletId) {
  const subWallets = await prisma.subWallet.findMany({ where: { walletId } });
  return getWalletTotalsForSubWallets(walletId, subWallets);
}

export async function getWalletTotalsForSubWallets(walletId, subWallets) {
  const [spentBySubWallet, credits] = await Promise.all([
    getSubWalletSpentByIds(subWallets.map((sw) => sw.id)),
    prisma.ledgerEntry.aggregate({
      where: { walletId, entryType: 'credit', subWalletId: null },
      _sum: { amount: true },
    }),
  ]);
  const allocated = subWallets.reduce((sum, sw) => sum + Number(sw.allocatedAmount), 0);
  const spent = subWallets.reduce((sum, sw) => sum + (spentBySubWallet.get(sw.id) ?? 0), 0);
  const funded = Number(credits._sum.amount ?? 0);

  return {
    funded,
    allocated,
    spent,
    remaining: funded - spent,
    spentBySubWallet,
  };
}

export function evaluatePaymentRequestRules({ amount, subWallet, payee, invoiceUrl }) {
  const flags = [];
  if (!Number.isFinite(amount) || amount <= 0) {
    return { blocked: true, reason: 'Payment amount must be greater than zero', flags };
  }

  if (subWallet.status !== 'active') {
    return { blocked: true, reason: 'Sub-wallet is not active', flags };
  }

  if (subWallet.wallet?.status && subWallet.wallet.status !== 'active') {
    return { blocked: true, reason: 'Wallet is not active', flags };
  }

  const balance = Number(subWallet.allocatedAmount) - Number(subWallet._spent ?? 0);

  if (balance < 0 || amount > balance) {
    return { blocked: true, reason: 'Amount exceeds available sub-wallet balance', flags };
  }

  if (Number(subWallet.approvalLimit ?? 0) > 0 && amount > Number(subWallet.approvalLimit)) {
    flags.push('Amount exceeds approval limit — donor approval required');
  }

  if (payee.verificationStatus !== 'verified') {
    flags.push('Payee is not verified');
  }

  if (!invoiceUrl) {
    flags.push('Invoice or supporting document is missing');
  }

  const serviceProvided = payee.serviceProvided;
  const purposeMatch =
    serviceProvided &&
    (subWallet.purpose.toLowerCase().includes(serviceProvided.toLowerCase()) ||
      serviceProvided.toLowerCase().includes(subWallet.purpose.toLowerCase()));

  if (serviceProvided && !purposeMatch && subWallet.purpose.toLowerCase() !== serviceProvided.toLowerCase()) {
    const swWords = subWallet.purpose.toLowerCase().split(/\s+/);
    const payeeWords = serviceProvided.toLowerCase().split(/\s+/);
    const overlap = swWords.some((w) => payeeWords.includes(w) && w.length > 3);
    if (!overlap) {
      flags.push('Payment purpose may not match sub-wallet purpose');
    }
  }

  return { blocked: false, flags };
}
