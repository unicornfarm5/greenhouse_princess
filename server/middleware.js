import { findUserById, hasDatabase } from "./db.js";
import { verifyToken } from "./auth.js";

function getBearerToken(req) {
  const authorization = req.headers.authorization || "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : null;
}

export async function getAuthenticatedUser(req) {
  const token = getBearerToken(req);
  const payload = token ? verifyToken(token) : null;

  if (!payload?.sub || !hasDatabase()) {
    return null;
  }

  const user = await findUserById(payload.sub);
  return user ? {
    id: String(user.id),
    email: user.email,
    name: user.name,
    passwordHash: user.password_hash
  } : null;
}

export async function requireAuth(req, res, next) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized." });
    return;
  }

  req.user = user;
  next();
}
