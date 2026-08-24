import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  createProject,
  fundProject,
  createSubWallet,
  getProjectsForUser,
  getProjectById,
  assignRecipient,
} from '../services/projectService.js';

const router = Router();

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const projects = await getProjectsForUser(req.user.id, req.user.role);
    res.json(projects);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const project = await getProjectById(req.params.id, req.user.id, req.user.role);
    res.json(project);
  } catch (err) {
    next(err);
  }
});

router.post('/', authorize('donor', 'admin'), async (req, res, next) => {
  try {
    const project = await createProject(req.user.id, req.body);
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/fund', authorize('donor'), async (req, res, next) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    const result = await fundProject(req.params.id, req.user.id, amount);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/sub-wallets', authorize('donor'), async (req, res, next) => {
  try {
    const { name, purpose, allocatedAmount, approvalLimit } = req.body;
    if (!name || !purpose || !allocatedAmount) {
      return res.status(400).json({ error: 'name, purpose, and allocatedAmount are required' });
    }
    const subWallet = await createSubWallet(req.params.id, req.user.id, req.body);
    res.status(201).json(subWallet);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/assign-recipient', authorize('donor'), async (req, res, next) => {
  try {
    const { recipientId } = req.body;
    if (!recipientId) return res.status(400).json({ error: 'recipientId is required' });
    const project = await assignRecipient(req.params.id, req.user.id, recipientId);
    res.json(project);
  } catch (err) {
    next(err);
  }
});

export default router;
