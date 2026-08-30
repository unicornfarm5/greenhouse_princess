/* Name: Authentication utilities
  Responsibility: Create and verify tokens, hash passwords, and expose safe user data. */

import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'greenhouse-princess-dev-secret';

function createToken(user) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: user.id,
    email: user.email,
    name: user.name,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7
  })).toString('base64url');

  const signingInput = `${header}.${payload}`;
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(signingInput)
    .digest('base64url');

  return `${signingInput}.${signature}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  const [headerBase64, payloadBase64, signature] = parts;
  const signingInput = `${headerBase64}.${payloadBase64}`;
  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(signingInput)
    .digest('base64url');

  if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    try {
      const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));
      const now = Math.floor(Date.now() / 1000);

      if (payload.exp && payload.exp < now) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  return null;
}

async function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

async function verifyPassword(password, passwordHash) {
  return new Promise((resolve, reject) => {
    if (!password || typeof passwordHash !== 'string') {
      resolve(false);
      return;
    }

    const [salt, hash] = passwordHash.split(':');
    if (!salt || !hash) {
      resolve(false);
      return;
    }

    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey.toString('hex') === hash);
    });
  });
}

function buildPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name
  };
}

export { createToken, verifyToken, hashPassword, verifyPassword, buildPublicUser };
