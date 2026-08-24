import prisma from './prisma.js';

export async function createAuditLog({ userId, action, entityType, entityId, oldValue, newValue }) {
  return prisma.auditLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId,
      oldValue: oldValue ?? undefined,
      newValue: newValue ?? undefined,
    },
  });
}

export function generateReferenceNumber() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `DF-${ts}-${rand}`;
}
