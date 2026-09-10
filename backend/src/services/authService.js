import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { signToken } from '../lib/auth.js';
import { createAuditLog } from '../lib/utils.js';

export async function registerUser({ fullName, email, phone, password, role }) {
  const existing = await prisma.user.findFirst({ where: { email } });
  if (existing) {
    const err = new Error('Email already registered');
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { fullName, email, phone, passwordHash, role },
    select: { id: true, fullName: true, email: true, phone: true, role: true, createdAt: true },
  });

  await createAuditLog({
    userId: user.id,
    action: 'User registered',
    entityType: 'user',
    entityId: user.id,
    newValue: { email, role },
  });

  const token = signToken({ id: user.id, email: user.email, role: user.role });
  return { user, token };
}

export async function loginUser({ email, password }) {
  try {
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) {
      const err = new Error('Invalid email or password');
      err.status = 401;
      throw err;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      const err = new Error('Invalid email or password');
      err.status = 401;
      throw err;
    }

    const token = signToken({ id: user.id, email: user.email, role: user.role });
    const { passwordHash, ...safeUser } = user;
    return { user: safeUser, token };
  } catch (err) {
    console.error('Login failed', {
      name: err.name,
      code: err.code,
      message: err.message,
      email,
    });
    throw err;
  }
}

export async function getUserById(id) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, fullName: true, email: true, phone: true, role: true, createdAt: true },
  });
}
