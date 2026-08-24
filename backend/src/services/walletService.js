import prisma from '../lib/prisma.js';

export async function getSubWalletSpent(subWalletId) {
  const result = await prisma.ledgerEntry.aggregate({
    where: { subWalletId, entryType: 'debit' },
    _sum: { amount: true },
  });
  return Number(result._sum.amount ?? 0);
}

export async function getSubWalletBalance(subWallet) {
  const spent = await getSubWalletSpent(subWallet.id);
  return Number(subWallet.allocatedAmount) - spent;
}

export async function getWalletTotals(walletId) {
  const subWallets = await prisma.subWallet.findMany({ where: { walletId } });
  let allocated = 0;
  let spent = 0;

  for (const sw of subWallets) {
    allocated += Number(sw.allocatedAmount);
    spent += await getSubWalletSpent(sw.id);
  }

  const credits = await prisma.ledgerEntry.aggregate({
    where: { walletId, entryType: 'credit', subWalletId: null },
    _sum: { amount: true },
  });
  const funded = Number(credits._sum.amount ?? 0);

  return {
    funded,
    allocated,
    spent,
    remaining: funded - spent,
  };
}

export function evaluatePaymentRequestRules({ amount, subWallet, payee, invoiceUrl }) {
  const flags = [];
  const balance = Number(subWallet.allocatedAmount) - Number(subWallet._spent ?? 0);

  if (amount > balance) {
    return { blocked: true, reason: 'Amount exceeds available sub-wallet balance', flags };
  }

  if (subWallet.status === 'frozen') {
    return { blocked: true, reason: 'Sub-wallet is frozen', flags };
  }

  if (subWallet.approvalLimit && amount > Number(subWallet.approvalLimit)) {
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
