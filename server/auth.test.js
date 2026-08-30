import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPublicUser, createToken, verifyToken, hashPassword, verifyPassword } from './auth.js';

test('createToken + verifyToken round-trip works', () => {
  const token = createToken({ id: 'user-123', email: 'demo@example.com' });
  const payload = verifyToken(token);

  assert.equal(payload.sub, 'user-123');
  assert.equal(payload.email, 'demo@example.com');
});

test('buildPublicUser removes sensitive properties', () => {
  const user = {
    id: 'user-123',
    email: 'demo@example.com',
    name: 'Demo user',
    passwordHash: 'super-secret-hash',
    avatarUrl: '/uploads/avatars/default-avatar.svg'
  };

  const publicUser = buildPublicUser(user);

  assert.deepEqual(publicUser, {
    id: 'user-123',
    email: 'demo@example.com',
    name: 'Demo user',
    avatarUrl: '/uploads/avatars/default-avatar.svg'
  });
});

test('password hashing and verification works', async () => {
  const passwordHash = await hashPassword('secure-password');
  const isValid = await verifyPassword('secure-password', passwordHash);
  const isInvalid = await verifyPassword('wrong-password', passwordHash);

  assert.equal(isValid, true);
  assert.equal(isInvalid, false);
});
