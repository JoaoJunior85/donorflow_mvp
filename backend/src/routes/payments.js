import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  createPayee,
  listPayees,
  verifyPayee,
  createPaymentRequest,
  listPaymentRequests,
  getPaymentRequestById,
  processApproval,
  listTransactions,
} from '../services/paymentService.js';

const router = Router();

router.use(authenticate);

router.get('/payees', async (req, res, next) => {
  try {
    const payees = await listPayees();
    res.json(payees);
  } catch (err) {
    next(err);
  }
});

router.post('/payees', async (req, res, next) => {
  try {
    const payee = await createPayee(req.body, req.user.id);
    res.status(201).json(payee);
  } catch (err) {
    next(err);
  }
});

router.patch('/payees/:id/verify', authorize('admin'), async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['verified', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const payee = await verifyPayee(req.params.id, status, req.user.id);
    res.json(payee);
  } catch (err) {
    next(err);
  }
});

router.get('/requests', async (req, res, next) => {
  try {
    const requests = await listPaymentRequests(req.user.id, req.user.role, req.query);
    res.json(requests);
  } catch (err) {
    next(err);
  }
});

router.get('/requests/:id', async (req, res, next) => {
  try {
    const request = await getPaymentRequestById(req.params.id, req.user.id, req.user.role);
    res.json(request);
  } catch (err) {
    next(err);
  }
});

router.post('/requests', authorize('recipient'), async (req, res, next) => {
  try {
    const { projectId, subWalletId, payeeId, amount, purpose, description, invoiceUrl } = req.body;
    if (!projectId || !subWalletId || !payeeId || !amount || !purpose) {
      return res.status(400).json({
        error: 'projectId, subWalletId, payeeId, amount, and purpose are required',
      });
    }
    const request = await createPaymentRequest(req.user.id, req.body);
    res.status(201).json(request);
  } catch (err) {
    next(err);
  }
});

router.post('/requests/:id/approve', authorize('donor'), async (req, res, next) => {
  try {
    const { decision, comment } = req.body;
    if (!['approved', 'rejected', 'frozen', 'needs_more_information'].includes(decision)) {
      return res.status(400).json({ error: 'Invalid decision' });
    }
    const result = await processApproval(req.params.id, req.user.id, { decision, comment });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/transactions', async (req, res, next) => {
  try {
    const transactions = await listTransactions(req.user.id, req.user.role, req.query);
    res.json(transactions);
  } catch (err) {
    next(err);
  }
});

export default router;
