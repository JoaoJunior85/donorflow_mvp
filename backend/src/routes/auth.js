import { Router } from 'express';
import { registerUser, loginUser } from '../services/authService.js';

const router = Router();

router.post('/register', async (req, res, next) => {
  try {
    const fullName = String(req.body.fullName ?? '').trim();
    const email = String(req.body.email ?? '').trim().toLowerCase();
    const phone = req.body.phone ? String(req.body.phone).trim() : undefined;
    const password = String(req.body.password ?? '');
    const role = req.body.role;
    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ error: 'fullName, email, password, and role are required' });
    }
    if (fullName.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
      return res.status(400).json({ error: 'Enter a valid name and email address' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (!['donor', 'recipient'].includes(role)) {
      return res.status(400).json({ error: 'Only donor and recipient accounts can self-register' });
    }
    const result = await registerUser({ fullName, email, phone, password, role });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body.email ?? '').trim().toLowerCase();
    const password = String(req.body.password ?? '');
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    const result = await loginUser({ email, password });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
