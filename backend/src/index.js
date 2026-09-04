import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import paymentRoutes from './routes/payments.js';
import reportRoutes from './routes/reports.js';
import { authenticate } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import prisma from './lib/prisma.js';
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const defaultJwtSecret = 'change-this-to-a-long-random-secret-in-production';
const requiredEnvironment = ['DATABASE_URL', 'JWT_SECRET'];
const missingEnvironment = requiredEnvironment.filter((name) => !process.env[name]);

if (missingEnvironment.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvironment.join(', ')}`);
}

if (isProduction && process.env.JWT_SECRET === defaultJwtSecret) {
  throw new Error('JWT_SECRET must be replaced before starting in production');
}

if (isProduction && !process.env.FRONTEND_URL) {
  throw new Error('FRONTEND_URL is required in production');
}

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'DonorFlow API' });
});

app.get('/api/health/db', async (req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', service: 'DonorFlow API', database: 'connected' });
  } catch (err) {
    err.status = 503;
    next(err);
  }
});

app.get('/api/me', authenticate, async (req, res) => {
  res.json(req.user);
});

app.get('/api/recipients', authenticate, async (req, res, next) => {
  try {
    const prisma = (await import('./lib/prisma.js')).default;
    const recipients = await prisma.user.findMany({
      where: { role: 'recipient' },
      select: { id: true, fullName: true, email: true },
    });
    res.json(recipients);
  } catch (err) {
    next(err);
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports', reportRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`DonorFlow API running on http://localhost:${PORT}`);
});
