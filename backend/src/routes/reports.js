import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getDonorDashboard,
  getRecipientDashboard,
  getAdminDashboard,
  getProjectReport,
  getAuditLogs,
  listUsers,
  listOrganizations,
  createOrganization,
} from '../services/reportService.js';

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
