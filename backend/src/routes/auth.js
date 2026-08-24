import { Router } from 'express';
import { registerUser, loginUser } from '../services/authService.js';

const router = Router();

router.post('/register', async (req, res, next) => {
  try {
    const { fullName, email, phone, password, role } = req.body;
    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ error: 'fullName, email, password, and role are required' });
    }
    if (!['donor', 'recipient', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    const result = await registerUser({ fullName, email, phone, password, role });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
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
