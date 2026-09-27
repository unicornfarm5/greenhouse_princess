-- Name: Greenhouse Princess database schema
-- Responsibility: Define PostgreSQL tables and indexes for users and plants.

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name VARCHAR(80) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS plant_updates (
  id BIGSERIAL PRIMARY KEY,
  plant_id INTEGER NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  pot_size_cm INTEGER CHECK (pot_size_cm IS NULL OR pot_size_cm > 0),
  dirt_type_note VARCHAR(500),
  health_check_note VARCHAR(1000),
  other_note VARCHAR(1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT plant_updates_has_content CHECK (
    pot_size_cm IS NOT NULL
    OR dirt_type_note IS NOT NULL
    OR health_check_note IS NOT NULL
    OR other_note IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_plants_user_id ON plants(user_id);
CREATE INDEX IF NOT EXISTS idx_plants_created_at ON plants(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plant_updates_plant_id_created_at
  ON plant_updates(plant_id, created_at DESC);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_users_updated_at ON users;
CREATE TRIGGER set_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_plants_updated_at ON plants;
CREATE TRIGGER set_plants_updated_at
BEFORE UPDATE ON plants
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
