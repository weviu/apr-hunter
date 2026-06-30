import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';

// ─── Mock repositories ────────────────────────────────────────────────────────
vi.mock('@/repositories/userRepository', () => ({
  createUser: vi.fn(),
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
  updateUserPassword: vi.fn(),
}));

vi.mock('@/repositories/sessionRepository', () => ({
  createSession: vi.fn(),
  findSessionByTokenHash: vi.fn(),
  deleteSession: vi.fn(),
  deleteAllUserSessions: vi.fn(),
}));

import * as userRepo from '@/repositories/userRepository';
import * as sessionRepo from '@/repositories/sessionRepository';
import {
  register,
  login,
  logout,
  logoutAll,
  me,
  changePassword,
} from '@/services/AuthService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const userId = new ObjectId();
const sessionId = new ObjectId();

function makeUser(overrides: Partial<import('@/repositories/userRepository').UserDocument> = {}) {
  return {
    _id: userId,
    email: 'alice@example.com',
    passwordHash: '',
    name: 'Alice',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } satisfies import('@/repositories/userRepository').UserDocument;
}

function makeSession(overrides: Partial<import('@/repositories/sessionRepository').SessionDocument> = {}) {
  return {
    _id: sessionId,
    userId,
    tokenHash: 'abc123',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 86400_000),
    ...overrides,
  } satisfies import('@/repositories/sessionRepository').SessionDocument;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AuthService  register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a user, opens a session, and returns a token', async () => {
    vi.mocked(userRepo.findUserByEmail).mockResolvedValue(null);
    vi.mocked(userRepo.createUser).mockResolvedValue(userId.toHexString());
    vi.mocked(sessionRepo.createSession).mockResolvedValue(sessionId.toHexString());

    const result = await register('alice@example.com', 'Password1!', 'Alice');

    expect(result.user.email).toBe('alice@example.com');
    expect(result.user.name).toBe('Alice');
    expect(typeof result.token).toBe('string');
    expect(result.token.length).toBeGreaterThan(32);
    expect(userRepo.createUser).toHaveBeenCalledOnce();
    expect(sessionRepo.createSession).toHaveBeenCalledOnce();
  });

  it('throws EMAIL_TAKEN when email already exists', async () => {
    vi.mocked(userRepo.findUserByEmail).mockResolvedValue(makeUser());

    await expect(register('alice@example.com', 'Password1!', 'Alice')).rejects.toMatchObject({
      message: 'Email already in use',
      code: 'EMAIL_TAKEN',
    });

    expect(userRepo.createUser).not.toHaveBeenCalled();
  });
});

describe('AuthService  login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when user is not found', async () => {
    vi.mocked(userRepo.findUserByEmail).mockResolvedValue(null);
    const result = await login('nobody@example.com', 'pass');
    expect(result).toBeNull();
  });

  it('returns null when password is wrong', async () => {
    // Use a real bcrypt hash of a different password
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash('correct-password', 10);
    vi.mocked(userRepo.findUserByEmail).mockResolvedValue(makeUser({ passwordHash }));

    const result = await login('alice@example.com', 'wrong-password');
    expect(result).toBeNull();
    expect(sessionRepo.createSession).not.toHaveBeenCalled();
  });

  it('creates a session and returns a token on success', async () => {
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash('secret123', 10);
    vi.mocked(userRepo.findUserByEmail).mockResolvedValue(makeUser({ passwordHash }));
    vi.mocked(sessionRepo.createSession).mockResolvedValue(sessionId.toHexString());

    const result = await login('alice@example.com', 'secret123');

    expect(result).not.toBeNull();
    expect(typeof result!.token).toBe('string');
    expect(result!.token.length).toBeGreaterThan(32);
    expect(result!.user.email).toBe('alice@example.com');
    expect(sessionRepo.createSession).toHaveBeenCalledOnce();
  });
});

describe('AuthService  logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes the session when found', async () => {
    vi.mocked(sessionRepo.findSessionByTokenHash).mockResolvedValue(makeSession());
    vi.mocked(sessionRepo.deleteSession).mockResolvedValue(true);

    await logout('some-raw-token');

    expect(sessionRepo.deleteSession).toHaveBeenCalledWith(sessionId);
  });

  it('does nothing when session not found', async () => {
    vi.mocked(sessionRepo.findSessionByTokenHash).mockResolvedValue(null);

    await logout('unknown-token');

    expect(sessionRepo.deleteSession).not.toHaveBeenCalled();
  });
});

describe('AuthService  me', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns user data when session and user are found', async () => {
    vi.mocked(sessionRepo.findSessionByTokenHash).mockResolvedValue(makeSession());
    vi.mocked(userRepo.findUserById).mockResolvedValue(makeUser());

    const result = await me('raw-token');

    expect(result).toMatchObject({ email: 'alice@example.com', name: 'Alice' });
  });

  it('returns null when session is not found', async () => {
    vi.mocked(sessionRepo.findSessionByTokenHash).mockResolvedValue(null);

    const result = await me('expired-token');
    expect(result).toBeNull();
  });

  it('returns null when user no longer exists', async () => {
    vi.mocked(sessionRepo.findSessionByTokenHash).mockResolvedValue(makeSession());
    vi.mocked(userRepo.findUserById).mockResolvedValue(null);

    const result = await me('orphan-token');
    expect(result).toBeNull();
  });
});

describe('AuthService  changePassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns false when current password is wrong', async () => {
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash('correct', 10);
    vi.mocked(userRepo.findUserById).mockResolvedValue(makeUser({ passwordHash }));

    const result = await changePassword(userId.toHexString(), 'wrong', 'newpass');
    expect(result).toBe(false);
    expect(userRepo.updateUserPassword).not.toHaveBeenCalled();
  });

  it('updates password and invalidates all sessions on success', async () => {
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash('oldpass', 10);
    vi.mocked(userRepo.findUserById).mockResolvedValue(makeUser({ passwordHash }));
    vi.mocked(userRepo.updateUserPassword).mockResolvedValue(true);
    vi.mocked(sessionRepo.deleteAllUserSessions).mockResolvedValue(1);

    const result = await changePassword(userId.toHexString(), 'oldpass', 'newpass');

    expect(result).toBe(true);
    expect(userRepo.updateUserPassword).toHaveBeenCalledOnce();
    expect(sessionRepo.deleteAllUserSessions).toHaveBeenCalledOnce();
  });
});

describe('AuthService  logoutAll', () => {
  it('calls deleteAllUserSessions', async () => {
    vi.mocked(sessionRepo.deleteAllUserSessions).mockResolvedValue(3);
    await logoutAll(userId.toHexString());
    expect(sessionRepo.deleteAllUserSessions).toHaveBeenCalledWith(userId.toHexString());
  });
});
