import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getDonorDashboard,
  getRecipientDashboard,
  getAdminDashboard,
  getProjectReport,
  getAuditLogs,
  getNotifications,
  listUsers,
  listOrganizations,
  createOrganization,
} from '../services/reportService.js';
import { subscribeNotifications } from '../lib/notifications.js';

const router = Router();

router.use(authenticate);

router.get('/dashboard', async (req, res, next) => {
  try {
    let data;
    if (req.user.role === 'donor') {
      data = await getDonorDashboard(req.user.id);
    } else if (req.user.role === 'recipient') {
      data = await getRecipientDashboard(req.user.id);
    } else {
      data = await getAdminDashboard();
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/projects/:id', async (req, res, next) => {
  try {
    const report = await getProjectReport(req.params.id, req.user.id, req.user.role);
    res.json(report);
  } catch (err) {
    next(err);
  }
});

router.get('/notifications', async (req, res, next) => {
  try {
    const items = await getNotifications(req.user.id, req.user.role);
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.get('/events', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  const send = (payload) => {
    const isRecipient = payload.userId === req.user.id
      || payload.recipientUserIds?.includes(req.user.id)
      || payload.roles?.includes(req.user.role);
    if (isRecipient) {
      res.write(`data: ${JSON.stringify({ type: 'notification', ...payload })}\n\n`);
    }
  };

  const unsubscribe = subscribeNotifications(send);
  const heartbeat = setInterval(() => {
    res.write(': ping\n\n');
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

router.get('/audit-logs', authorize('admin'), async (req, res, next) => {
  try {
    const logs = await getAuditLogs(Number(req.query.limit) || 50);
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

router.get('/users', authorize('admin'), async (req, res, next) => {
  try {
    const users = await listUsers();
    res.json(users);
  } catch (err) {
    next(err);
  }
});

router.get('/organizations', authorize('admin'), async (req, res, next) => {
  try {
    const orgs = await listOrganizations();
    res.json(orgs);
  } catch (err) {
    next(err);
  }
});

router.post('/organizations', authorize('admin'), async (req, res, next) => {
  try {
    const org = await createOrganization(req.body);
    res.status(201).json(org);
  } catch (err) {
    next(err);
  }
});

export default router;
