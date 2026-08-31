/* Name: Authentication routes
  Responsibility: Handle signup, login, current-user, and profile API requests. */

import { Router } from "express";
import {
  createUser,
  findUserByEmail,
  updateUserName,
  hasDatabase
} from "../db.js";
import { buildPublicUser, createToken, hashPassword, verifyPassword } from "../auth.js";
import { getAuthenticatedUser, requireAuth } from "../middleware.js";
import { FIELD_LIMITS, validateEmail, validateTextField } from "../validation.js";

const router = Router();

router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body || {};
  const validatedName = validateTextField(name, FIELD_LIMITS.name, 2);
  const validatedEmail = validateEmail(email);
  const passwordText = typeof password === "string" ? password.trim() : "";

  if (!validatedName || !validatedEmail || passwordText.length < 6 || passwordText.length > FIELD_LIMITS.password) {
    res.status(400).json({ error: "Name, valid email and password (6+ chars) are required." });
    return;
  }

  if (!hasDatabase()) {
    res.status(503).json({ error: "Database is not configured." });
    return;
  }

  const existingUser = await findUserByEmail(validatedEmail);
  if (existingUser) {
    res.status(409).json({ error: "This email is already registered." });
    return;
  }

  try {
    const createdUser = await createUser({
      email: validatedEmail,
      passwordHash: await hashPassword(passwordText),
      name: validatedName
    });
    const token = createToken({ id: String(createdUser.id), email: createdUser.email, name: createdUser.name });

    res.status(201).json({
      token,
      user: buildPublicUser(createdUser)
    });
  } catch {
    res.status(500).json({ error: "Could not create account." });
  }
});

router.post("/login", async (req, res) => {
  const email = validateEmail(req.body?.email);
  const passwordText = typeof req.body?.password === "string" ? req.body.password : "";

  if (!email || !passwordText) {
    res.status(400).json({ error: "Valid email and password are required." });
    return;
  }

  if (!hasDatabase()) {
    res.status(503).json({ error: "Database is not configured." });
    return;
  }

  const user = await findUserByEmail(email);
  if (!user || !(await verifyPassword(passwordText, user.password_hash))) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  const token = createToken({ id: String(user.id), email: user.email, name: user.name });
  res.json({ token, user: buildPublicUser(user) });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: buildPublicUser(req.user) });
});

router.patch("/profile", requireAuth, async (req, res) => {
  const nextName = validateTextField(req.body?.name, FIELD_LIMITS.name, 2);
  if (!nextName) {
    res.status(400).json({ error: "A valid name is required." });
    return;
  }

  try {
    const updatedUser = await updateUserName(req.user.id, nextName);
    if (!updatedUser) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    res.json({ user: buildPublicUser(updatedUser) });
  } catch (error) {
    console.error("[PATCH /api/profile] database error", error);
    res.status(500).json({ error: "Could not update profile." });
  }
});

export default router;
