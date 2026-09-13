import prisma from './prisma.js';
import { publishNotification } from './notifications.js';

export async function createAuditLog({ userId, action, entityType, entityId, oldValue, newValue }, db = prisma) {
  const log = await db.auditLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId,
      oldValue: oldValue ?? undefined,
      newValue: newValue ?? undefined,
    },
  });

  publishNotification({
    id: log.id,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    label: log.action,
    createdAt: log.createdAt,
    userId: log.userId,
    roles: ['admin'],
  });

  return log;
}

export function generateReferenceNumber() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `DF-${ts}-${rand}`;
}
