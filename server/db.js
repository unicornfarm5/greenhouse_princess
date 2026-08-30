/* Name: PostgreSQL data access
  Responsibility: Initialize the schema and execute user and plant database operations. */

import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
const pool = connectionString ? new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
}) : null;

export function hasDatabase() {
  return Boolean(pool);
}

export async function initializeDatabase() {
  if (!pool) {
    return false;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name VARCHAR(80) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS plants (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(80) NOT NULL,
      plant_type VARCHAR(80) NOT NULL,
      watering_text VARCHAR(120) NOT NULL,
      mood VARCHAR(40) NOT NULL,
      image_data BYTEA,
      image_mime VARCHAR(50),
      image_name VARCHAR(120),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_plants_user_id ON plants(user_id);
    CREATE INDEX IF NOT EXISTS idx_plants_created_at ON plants(created_at DESC);
  `);

  return true;
}

export async function createUser({ email, passwordHash, name }) {
  if (!pool) {
    throw new Error("Database is not configured.");
  }

  const result = await pool.query(
    `INSERT INTO users (email, password_hash, name)
     VALUES ($1, $2, $3)
     RETURNING id, email, name`,
    [email, passwordHash, name]
  );

  return result.rows[0];
}

export async function findUserByEmail(email) {
  if (!pool) {
    return null;
  }

  const result = await pool.query(
    `SELECT id, email, password_hash, name
     FROM users
     WHERE email = $1`,
    [email]
  );

  return result.rows[0] || null;
}

export async function findUserById(id) {
  if (!pool) {
    return null;
  }

  const result = await pool.query(
    `SELECT id, email, name, password_hash
     FROM users
     WHERE id = $1`,
    [id]
  );

  return result.rows[0] || null;
}

export async function updateUserName(id, name) {
  if (!pool) {
    return null;
  }

  const result = await pool.query(
    `UPDATE users
     SET name = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING id, email, name`,
    [id, name]
  );

  return result.rows[0] || null;
}

export async function createPlant({ userId, name, plantType, wateringText, mood, imageData, imageMime, imageName }) {
  if (!pool) {
    throw new Error("Database is not configured.");
  }

  const result = await pool.query(
    `INSERT INTO plants (user_id, name, plant_type, watering_text, mood, image_data, image_mime, image_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, user_id AS "userId", name, plant_type AS "plantType", watering_text AS "wateringText", mood, image_data AS "imageData", image_mime AS "imageMime", image_name AS "imageName"`,
    [userId, name, plantType, wateringText, mood, imageData || null, imageMime || null, imageName || null]
  );

  return result.rows[0];
}

export async function updatePlantById({ id, userId, wateringText, mood, imageData, imageMime, imageName }) {
  if (!pool) {
    return null;
  }

  const assignments = [];
  const values = [];

  if (wateringText !== undefined) {
    assignments.push(`watering_text = $${values.length + 3}`);
    values.push(wateringText);
  }

  if (mood !== undefined) {
    assignments.push(`mood = $${values.length + 3}`);
    values.push(mood);
  }

  if (imageData !== undefined) {
    assignments.push(`image_data = $${values.length + 3}`);
    values.push(imageData);
  }

  if (imageMime !== undefined) {
    assignments.push(`image_mime = $${values.length + 3}`);
    values.push(imageMime);
  }

  if (imageName !== undefined) {
    assignments.push(`image_name = $${values.length + 3}`);
    values.push(imageName);
  }

  if (assignments.length === 0) {
    return null;
  }

  assignments.push(`updated_at = NOW()`);
  values.unshift(id, userId);

  const result = await pool.query(
    `UPDATE plants
     SET ${assignments.join(", ")}
     WHERE id = $1 AND user_id = $2
     RETURNING id, user_id AS "userId", name, plant_type AS "plantType", watering_text AS "wateringText", mood, image_data AS "imageData", image_mime AS "imageMime", image_name AS "imageName"`,
    values
  );

  return result.rows[0] || null;
}

export async function deletePlantById(id, userId) {
  if (!pool) {
    return false;
  }

  const result = await pool.query(
    `DELETE FROM plants
     WHERE id = $1 AND user_id = $2
     RETURNING id`,
    [id, userId]
  );

  return result.rowCount > 0;
}

export async function listPlantsByUser(userId) {
  if (!pool) {
    return [];
  }

  const result = await pool.query(
    `SELECT id, user_id AS "userId", name, plant_type AS "plantType", watering_text AS "wateringText", mood, image_data AS "imageData", image_mime AS "imageMime", image_name AS "imageName"
     FROM plants
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  return result.rows;
}

export async function listAllPlants() {
  if (!pool) {
    return [];
  }

  const result = await pool.query(
    `SELECT id, user_id AS "userId", name, plant_type AS "plantType", watering_text AS "wateringText", mood, image_data AS "imageData", image_mime AS "imageMime", image_name AS "imageName"
     FROM plants
     ORDER BY created_at DESC`
  );

  return result.rows;
}
