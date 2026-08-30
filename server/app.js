import cors from "cors";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { buildPublicUser, createToken, hashPassword, verifyPassword, verifyToken } from "./auth.js";

const app = express();
const port = 3001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const plantsFilePath = path.join(__dirname, "plants.json");
const usersFilePath = path.join(__dirname, "users.json");
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

function loadUsersFromFile() {
  ensureStorage();
  const parsed = readJsonFile(usersFilePath, []);
  return Array.isArray(parsed) ? parsed : [];
}

function saveUsersToFile(nextUsers) {
  writeJsonFile(usersFilePath, nextUsers);
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

function nextUserId(currentUsers) {
  return currentUsers.reduce((maxId, user) => Math.max(maxId, Number(user.id) || 0), 0) + 1;
}

let plants = loadPlantsFromFile();
let users = loadUsersFromFile();

function getBearerToken(req) {
  const authorization = req.headers.authorization || "";
  if (!authorization.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice(7).trim();
}

function getAuthenticatedUser(req) {
  const token = getBearerToken(req);
  if (!token) {
    return null;
  }

  const payload = verifyToken(token);
  if (!payload || !payload.sub) {
    return null;
  }

  return users.find((user) => user.id === payload.sub) || null;
}

function requireAuth(req, res, next) {
  const user = getAuthenticatedUser(req);
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

  if (users.some((user) => user.email === validatedEmail)) {
    res.status(409).json({ error: "This email is already registered." });
    return;
  }

  try {
    const newUser = {
      id: String(nextUserId(users)),
      email: validatedEmail,
      name: validatedName,
      passwordHash: await hashPassword(passwordText),
      avatarUrl: null
    };

    users.push(newUser);
    saveUsersToFile(users);

    const token = createToken(newUser);
    res.status(201).json({
      token,
      user: buildPublicUser(newUser)
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

  const user = users.find((candidate) => candidate.email === email);
  if (!user) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  const matches = await verifyPassword(passwordText, user.passwordHash);
  if (!matches) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  const token = createToken(user);
  res.json({
    token,
    user: buildPublicUser(user)
  });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({ user: buildPublicUser(req.user) });
});

app.patch("/api/profile", requireAuth, (req, res) => {
  const { name, avatarUrl } = req.body || {};
  const nextName = validateTextField(name, FIELD_LIMITS.name, 2);
  const nextAvatar = typeof avatarUrl === "string" ? avatarUrl.trim() : null;

  if (!nextName && !nextAvatar) {
    res.status(400).json({ error: "No profile changes provided." });
    return;
  }

  const userIndex = users.findIndex((user) => user.id === req.user.id);
  if (userIndex === -1) {
    res.status(404).json({ error: "User not found." });
    return;
  }

  if (nextName) {
    users[userIndex].name = nextName;
  }

  if (nextAvatar) {
    users[userIndex].avatarUrl = nextAvatar;
  }

  saveUsersToFile(users);
  res.json({ user: buildPublicUser(users[userIndex]) });
});

app.get("/api/plants", requireAuth, (_req, res) => {
  const userPlants = plants.filter((plant) => String(plant.userId) === String(_req.user.id));
  res.json({ plants: userPlants });
});

app.get("/api/all_plants", (req, res) => {
  const user = getAuthenticatedUser(req);
  if (user) {
    const userPlants = plants.filter((plant) => String(plant.userId) === String(user.id));
    res.json({ plants: userPlants });
    return;
  }

  res.json({ plants });
});

app.get("/api/id/:id", (req, res) => {
  const id = Number(req.params.id);
  const user = getAuthenticatedUser(req);
  const targetPlant = plants.find((item) => item.id === id && (!user || String(item.userId) === String(user.id) || item.userId === null));

  if (!targetPlant) {
    res.status(404).json({ error: "Plant not found." });
    return;
  }

  res.json({ plant: targetPlant });
});

app.post("/api/plants", requireAuth, plantCreationLimiter, (req, res) => {
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
      userId: req.user.id
    });

    plants.push(createdPlant);
    savePlantsToFile(plants);
    res.status(201).json({ plant: createdPlant });
  } catch {
    res.status(500).json({ error: "Failed to save plant." });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
