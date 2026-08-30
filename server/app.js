import cors from "cors";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import {
  createPlant as createPlantRecord,
  createUser,
  findUserByEmail,
  findUserById,
  hasDatabase,
  initializeDatabase,
  listAllPlants,
  listPlantsByUser,
  updateUserName
} from "./db.js";
import { buildPublicUser, createToken, hashPassword, verifyPassword, verifyToken } from "./auth.js";

const app = express();
const port = 3001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const plantsFilePath = path.join(__dirname, "plants.json");
const uploadsDir = path.join(__dirname, "uploads");
const plantImagesDir = path.join(uploadsDir, "plants");
const avatarImagesDir = path.join(uploadsDir, "avatars");
const ALLOWED_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3001", "http://127.0.0.1:3001"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const FIELD_LIMITS = {
  name: 80,
  sort: 80,
  shouldBeWatered: 120,
  mood: 40,
  imageFileName: 120,
  email: 160,
  password: 128
};

class Plant {
  constructor({ id, name, sort, shouldBeWatered, mood, picture, userId }) {
    this.id = id;
    this.name = name;
    this.sort = sort;
    this.shouldBeWatered = shouldBeWatered;
    this.mood = mood;
    this.picture = picture;
    this.userId = userId || null;
  }
}

function validateTextField(value, maxLength, minLength = 1) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (trimmed.length < minLength || trimmed.length > maxLength) {
    return null;
  }

  return trimmed;
}

function validateEmail(value) {
  const trimmed = validateTextField(value, FIELD_LIMITS.email, 3);
  if (!trimmed) return null;

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(trimmed) ? trimmed.toLowerCase() : null;
}

function sanitizeFileBaseName(value) {
  return value
    .toLowerCase()
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function readJsonFile(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), "utf-8");
    return structuredClone(fallback);
  }

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    return parsed;
  } catch {
    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), "utf-8");
    return structuredClone(fallback);
  }
}

function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

const starterPlants = [
  new Plant({
    id: 1,
    name: "Luna",
    sort: "devil's ivy",
    shouldBeWatered: "Every 2 days",
    mood: "Thriving",
    picture: "/plants/devilsivy.png",
    userId: null
  }),
  new Plant({
    id: 2,
    name: "Mossy",
    sort: "philodendron",
    shouldBeWatered: "Every 4 days",
    mood: "Happy",
    picture: "/plants/philodendron.png",
    userId: null
  }),
  new Plant({
    id: 3,
    name: "Rosie",
    sort: "flamingo flower",
    shouldBeWatered: "Every 2 days",
    mood: "Blooming",
    picture: "/plants/flamingoflower.png",
    userId: null
  })
];

function ensureStorage() {
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.mkdirSync(plantImagesDir, { recursive: true });
  fs.mkdirSync(avatarImagesDir, { recursive: true });
}

function savePlantsToFile(nextPlants) {
  writeJsonFile(plantsFilePath, nextPlants);
}

function loadPlantsFromFile() {
  ensureStorage();

  const parsed = readJsonFile(plantsFilePath, starterPlants);
  if (!Array.isArray(parsed)) {
    return starterPlants.map((plant) => new Plant(plant));
  }

  return parsed.map((plant) => new Plant(plant));
}

function uniqueImageFileName(baseName, extension) {
  let counter = 0;
  let candidate = `${baseName}.${extension}`;

  while (fs.existsSync(path.join(plantImagesDir, candidate))) {
    counter += 1;
    candidate = `${baseName}-${counter}.${extension}`;
  }

  return candidate;
}

function validateImageMagicBytes(binary, extension) {
  if (extension === "png") {
    return binary.length >= 4 && binary[0] === 0x89 && binary[1] === 0x50 && binary[2] === 0x4e && binary[3] === 0x47;
  }

  if (extension === "jpg") {
    return binary.length >= 3 && binary[0] === 0xff && binary[1] === 0xd8 && binary[2] === 0xff;
  }

  if (extension === "webp") {
    return (
      binary.length >= 12 &&
      binary[0] === 0x52 &&
      binary[1] === 0x49 &&
      binary[2] === 0x46 &&
      binary[3] === 0x46 &&
      binary[8] === 0x57 &&
      binary[9] === 0x45 &&
      binary[10] === 0x42 &&
      binary[11] === 0x50
    );
  }

  return false;
}

function parseDataUrl(dataUrl) {
  const match = /^data:(image\/(png|jpeg|webp));base64,(.+)$/i.exec(dataUrl || "");

  if (!match) {
    return null;
  }

  const mimeType = match[1].toLowerCase();
  const extensionByMime = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp"
  };
  const extension = extensionByMime[mimeType];

  if (!extension) {
    return null;
  }

  try {
    const binary = Buffer.from(match[3], "base64");
    if (binary.length === 0 || binary.length > MAX_IMAGE_BYTES) {
      return null;
    }

    if (!validateImageMagicBytes(binary, extension)) {
      return null;
    }

    return { extension, binary };
  } catch {
    return null;
  }
}

function nextPlantId(currentPlants) {
  return currentPlants.reduce((maxId, plant) => Math.max(maxId, Number(plant.id) || 0), 0) + 1;
}

let plants = loadPlantsFromFile();

function getBearerToken(req) {
  const authorization = req.headers.authorization || "";
  if (!authorization.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice(7).trim();
}

async function getAuthenticatedUser(req) {
  const token = getBearerToken(req);
  if (!token) {
    return null;
  }

  const payload = verifyToken(token);
  if (!payload || !payload.sub) {
    return null;
  }

  if (!hasDatabase()) {
    return null;
  }

  const user = await findUserById(payload.sub);
  if (!user) {
    return null;
  }

  return {
    id: String(user.id),
    email: user.email,
    name: user.name,
    passwordHash: user.password_hash
  };
}

async function requireAuth(req, res, next) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized." });
    return;
  }

  req.user = user;
  next();
}

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("CORS not allowed"));
    }
  })
);
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(uploadsDir));

const plantCreationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/auth/signup", async (req, res) => {
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
      user: buildPublicUser({ id: String(createdUser.id), email: createdUser.email, name: createdUser.name })
    });
  } catch {
    res.status(500).json({ error: "Could not create account." });
  }
});

app.post("/api/auth/login", async (req, res) => {
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
  if (!user) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  const matches = await verifyPassword(passwordText, user.password_hash);
  if (!matches) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  const token = createToken({ id: String(user.id), email: user.email, name: user.name });
  res.json({
    token,
    user: buildPublicUser({ id: String(user.id), email: user.email, name: user.name })
  });
});

app.get("/api/auth/me", async (req, res) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized." });
    return;
  }

  res.json({ user: buildPublicUser(user) });
});

app.patch("/api/profile", async (req, res) => {
  const { name } = req.body || {};
  const nextName = validateTextField(name, FIELD_LIMITS.name, 2);

  if (!nextName) {
    res.status(400).json({ error: "A valid name is required." });
    return;
  }

  const authenticatedUser = await getAuthenticatedUser(req);
  if (!authenticatedUser) {
    res.status(401).json({ error: "Unauthorized." });
    return;
  }

  try {
    const updatedUser = await updateUserName(authenticatedUser.id, nextName);
    if (!updatedUser) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    res.json({ user: buildPublicUser({ ...updatedUser, email: authenticatedUser.email }) });
  } catch (error) {
    console.error("[PATCH /api/profile] database error", error);
    res.status(500).json({ error: "Could not update profile." });
  }
});

app.get("/api/plants", async (req, res) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized." });
    return;
  }

  if (hasDatabase()) {
    const plantRows = await listPlantsByUser(Number(user.id));
    res.json({ plants: plantRows.map((plant) => ({
      id: plant.id,
      userId: plant.userId,
      name: plant.name,
      sort: plant.plantType,
      shouldBeWatered: plant.wateringText,
      mood: plant.mood,
      picture: plant.imageUrl
    })) });
    return;
  }

  const userPlants = plants.filter((plant) => String(plant.userId) === String(user.id));
  res.json({ plants: userPlants });
});

app.get("/api/all_plants", async (req, res) => {
  const user = await getAuthenticatedUser(req);
  if (user) {
    if (hasDatabase()) {
      const plantRows = await listPlantsByUser(Number(user.id));
      res.json({ plants: plantRows.map((plant) => ({
        id: plant.id,
        userId: plant.userId,
        name: plant.name,
        sort: plant.plantType,
        shouldBeWatered: plant.wateringText,
        mood: plant.mood,
        picture: plant.imageUrl
      })) });
      return;
    }

    const userPlants = plants.filter((plant) => String(plant.userId) === String(user.id));
    res.json({ plants: userPlants });
    return;
  }

  res.json({ plants });
});

app.get("/api/id/:id", async (req, res) => {
  const id = Number(req.params.id);
  const user = await getAuthenticatedUser(req);

  if (hasDatabase()) {
    if (!user) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const plantRows = await listPlantsByUser(Number(user.id));
    const targetPlant = plantRows.find((item) => item.id === id);

    if (!targetPlant) {
      res.status(404).json({ error: "Plant not found." });
      return;
    }

    res.json({ plant: {
      id: targetPlant.id,
      userId: targetPlant.userId,
      name: targetPlant.name,
      sort: targetPlant.plantType,
      shouldBeWatered: targetPlant.wateringText,
      mood: targetPlant.mood,
      picture: targetPlant.imageUrl
    } });
    return;
  }

  const targetPlant = plants.find((item) => item.id === id && (!user || String(item.userId) === String(user.id) || item.userId === null));

  if (!targetPlant) {
    res.status(404).json({ error: "Plant not found." });
    return;
  }

  res.json({ plant: targetPlant });
});

app.post("/api/plants", async (req, res) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized." });
    return;
  }

  const { name, sort, shouldBeWatered, mood, imageFileName, imageDataUrl } = req.body || {};

  const validatedName = validateTextField(name, FIELD_LIMITS.name);
  const validatedSort = validateTextField(sort, FIELD_LIMITS.sort);
  const validatedShouldBeWatered = validateTextField(shouldBeWatered, FIELD_LIMITS.shouldBeWatered);
  const validatedMood = validateTextField(mood, FIELD_LIMITS.mood);
  const validatedImageFileName = validateTextField(imageFileName, FIELD_LIMITS.imageFileName);

  if (!validatedName || !validatedSort || !validatedShouldBeWatered || !validatedMood || !validatedImageFileName || !imageDataUrl) {
    res.status(400).json({ error: "Missing required fields." });
    return;
  }

  if (hasDatabase()) {
    const parsedImage = parseDataUrl(imageDataUrl);
    if (!parsedImage) {
      res.status(400).json({ error: "Invalid image format. Use pasted png, jpeg or webp image." });
      return;
    }

    const sanitizedBaseName = sanitizeFileBaseName(validatedImageFileName);
    const fileName = uniqueImageFileName(sanitizedBaseName || "plant", parsedImage.extension);
    const targetImagePath = path.join(plantImagesDir, fileName);

    try {
      fs.writeFileSync(targetImagePath, parsedImage.binary);
      const createdPlant = await createPlantRecord({
        userId: Number(user.id),
        name: validatedName,
        plantType: validatedSort,
        wateringText: validatedShouldBeWatered,
        mood: validatedMood,
        imageUrl: `/uploads/plants/${fileName}`
      });

      res.status(201).json({ plant: {
        id: createdPlant.id,
        userId: createdPlant.userId,
        name: createdPlant.name,
        sort: createdPlant.plantType,
        shouldBeWatered: createdPlant.wateringText,
        mood: createdPlant.mood,
        picture: createdPlant.imageUrl
      } });
      return;
    } catch {
      res.status(500).json({ error: "Failed to save plant." });
      return;
    }
  }

  const parsedImage = parseDataUrl(imageDataUrl);
  if (!parsedImage) {
    res.status(400).json({ error: "Invalid image format. Use pasted png, jpeg or webp image." });
    return;
  }

  const sanitizedBaseName = sanitizeFileBaseName(validatedImageFileName);
  if (!sanitizedBaseName) {
    res.status(400).json({ error: "Invalid image file name." });
    return;
  }

  const fileName = uniqueImageFileName(sanitizedBaseName, parsedImage.extension);
  const targetImagePath = path.join(plantImagesDir, fileName);

  try {
    fs.writeFileSync(targetImagePath, parsedImage.binary);

    const createdPlant = new Plant({
      id: nextPlantId(plants),
      name: validatedName,
      sort: validatedSort,
      shouldBeWatered: validatedShouldBeWatered,
      mood: validatedMood,
      picture: `/uploads/plants/${fileName}`,
      userId: user.id
    });

    plants.push(createdPlant);
    savePlantsToFile(plants);
    res.status(201).json({ plant: createdPlant });
  } catch {
    res.status(500).json({ error: "Failed to save plant." });
  }
});

app.post("/api/auth/signup", async (req, res) => {
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
      user: buildPublicUser({ id: String(createdUser.id), email: createdUser.email, name: createdUser.name })
    });
  } catch {
    res.status(500).json({ error: "Could not create account." });
  }
});

app.post("/api/auth/login", async (req, res) => {
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
  if (!user) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  const matches = await verifyPassword(passwordText, user.password_hash);
  if (!matches) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  const token = createToken({ id: String(user.id), email: user.email, name: user.name });
  res.json({
    token,
    user: buildPublicUser({ id: String(user.id), email: user.email, name: user.name })
  });
});

async function startServer() {
  try {
    const databaseInitialized = await initializeDatabase();
    if (databaseInitialized) {
      console.log("Connected to PostgreSQL database.");
    } else {
      console.warn("DATABASE_URL is not set; using local JSON storage.");
    }

    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error(`Database initialization failed: ${error.message}`);
    process.exitCode = 1;
  }
}

startServer();
