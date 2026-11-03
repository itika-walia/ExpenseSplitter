import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { signToken, type AuthUser } from '../middleware/auth';
import { HttpError } from '../utils/httpError';
import type { LoginInput, RegisterInput } from '../validators/auth.validators';

const BCRYPT_ROUNDS = 10;

function toAuthUser(user: { id: string; name: string; email: string }): AuthUser {
  return { id: user.id, name: user.name, email: user.email };
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw HttpError.conflict('An account with this email already exists');
  }
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
    },
  });
  const authUser = toAuthUser(user);
  return { user: authUser, token: signToken(authUser) };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  // Same message for unknown email and wrong password to avoid account enumeration
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw HttpError.unauthorized('Invalid email or password');
  }
  const authUser = toAuthUser(user);
  return { user: authUser, token: signToken(authUser) };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw HttpError.unauthorized('Account no longer exists');
  }
  return toAuthUser(user);
}
