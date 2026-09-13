import { EventEmitter } from 'node:events';

const hub = new EventEmitter();
hub.setMaxListeners(100);

export function publishNotification(payload) {
  hub.emit('notification', payload);
}

export function subscribeNotifications(listener) {
  hub.on('notification', listener);
  return () => hub.off('notification', listener);
}

export function notificationForAudit(log) {
  return {
    id: log.id,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    label: log.action,
    createdAt: log.createdAt,
    userName: log.user?.fullName ?? 'System',
  };
}
