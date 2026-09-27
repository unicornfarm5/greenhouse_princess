/* Name: Authentication tests
  Responsibility: Verify token handling, public-user sanitization, and password security. */

import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPublicUser, createToken, verifyToken, hashPassword, verifyPassword } from '../auth.js';
import { validateTextField } from '../validation.js';

test('createToken + verifyToken round-trip works', () => {
  const token = createToken({ id: 'user-123', email: 'demo@example.com' });
  const payload = verifyToken(token);

  assert.equal(payload.sub, 'user-123');
  assert.equal(payload.email, 'demo@example.com');
});

test('buildPublicUser removes sensitive properties and never exposes data', () => {
  const user = {
    id: 'user-123',
    email: 'demo@example.com',
    name: 'Demo user',
    passwordHash: 'super-secret-hash'
  };

  const publicUser = buildPublicUser(user);

  assert.deepEqual(publicUser, {
    id: 'user-123',
    email: 'demo@example.com',
    name: 'Demo user'
  });
});

test('password hashing and verification works', async () => {
  const passwordHash = await hashPassword('secure-password');
  const isValid = await verifyPassword('secure-password', passwordHash);
  const isInvalid = await verifyPassword('wrong-password', passwordHash);

  assert.equal(isValid, true);
  assert.equal(isInvalid, false);
});

test('text validation rejects markup and control characters', () => {
  assert.equal(validateTextField('<script>alert(1)</script>', 80), null);
  assert.equal(validateTextField('safe plant name', 80), 'safe plant name');
  assert.equal(validateTextField('name\u0000', 80), null);
});
