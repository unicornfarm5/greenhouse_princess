import cors from "cors";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const port = 3001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const plantsFilePath = path.join(__dirname, "plants.json");
const plantImagesDir = path.resolve(__dirname, "..", "client", "public", "plants");

class Plant {
  constructor({ id, name, sort, shouldBeWatered, mood, picture }) {
    this.id = id;
    this.name = name;
    this.sort = sort;
    this.shouldBeWatered = shouldBeWatered;
    this.mood = mood;
    this.picture = picture;
  }
}

const starterPlants = [
  new Plant({
    id: 1,
    name: "Luna",
    sort: "devil's ivy",
    shouldBeWatered: "Every 2 days",
    mood: "Thriving",
    picture: "/plants/devilsivy.png"
  }),
  new Plant({
    id: 2,
    name: "Mossy",
    sort: "philodendron",
    shouldBeWatered: "Every 4 days",
    mood: "Happy",
    picture: "/plants/philodendron.png"
  }),
  new Plant({
    id: 3,
    name: "Rosie",
    sort: "flamingo flower",
    shouldBeWatered: "Every 2 days",
    mood: "Blooming",
    picture: "/plants/flamingoflower.png"
  })
];

// Ensure we have a folder for uploaded/pasted plant images.
function ensureStorage() {
  fs.mkdirSync(plantImagesDir, { recursive: true });
}

// Persist all plants to local JSON so data survives restarts.
function savePlantsToFile(nextPlants) {
  fs.writeFileSync(plantsFilePath, JSON.stringify(nextPlants, null, 2), "utf-8");
}

// Load plants from disk, and bootstrap with starter data on first run.
function loadPlantsFromFile() {
  ensureStorage();

  if (!fs.existsSync(plantsFilePath)) {
    savePlantsToFile(starterPlants);
    return [...starterPlants];
  }

  try {
    const fileText = fs.readFileSync(plantsFilePath, "utf-8");
    const parsed = JSON.parse(fileText);

    if (!Array.isArray(parsed)) {
      return [...starterPlants];
    }

    return parsed.map((plant) => new Plant(plant));
  } catch {
    return [...starterPlants];
  }
}

// Keep file names safe for local filesystem and URL usage.
function sanitizeFileBaseName(value) {
  return value
    .toLowerCase()
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
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

// Accept only pasted image data URLs we can safely decode and store.
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
    if (binary.length === 0) {
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

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/api/all_plants", (_req, res) => {
  res.json({ plants });
});

app.get("/api/id/:id", (req, res) => {
  const id = Number(req.params.id);
  const plant = plants.find((item) => item.id === id);

  if (!plant) {
    res.status(404).json({ error: "Plant not found." });
    return;
  }

  res.json({ plant });
});

// ----------------------
// Add New Plant Flow API
// ----------------------
app.post("/api/plants", (req, res) => {
  const { name, sort, shouldBeWatered, mood, imageFileName, imageDataUrl } = req.body || {};

  if (!name || !sort || !shouldBeWatered || !mood || !imageFileName || !imageDataUrl) {
    res.status(400).json({ error: "Missing required fields." });
    return;
  }

  const parsedImage = parseDataUrl(imageDataUrl);
  if (!parsedImage) {
    res.status(400).json({ error: "Invalid image format. Use pasted png, jpeg or webp image." });
    return;
  }

  const sanitizedBaseName = sanitizeFileBaseName(imageFileName);
  if (!sanitizedBaseName) {
    res.status(400).json({ error: "Invalid image file name." });
    return;
  }

  const fileName = uniqueImageFileName(sanitizedBaseName, parsedImage.extension);
  const targetImagePath = path.join(plantImagesDir, fileName);

  try {
    // Save image first so the created plant points to a real file.
    fs.writeFileSync(targetImagePath, parsedImage.binary);

    const createdPlant = new Plant({
      id: nextPlantId(plants),
      name,
      sort,
      shouldBeWatered,
      mood,
      picture: `/plants/${fileName}`
    });

    plants.push(createdPlant);
    // Save the updated plant collection for next server startup.
    savePlantsToFile(plants);
    res.status(201).json({ plant: createdPlant });
  } catch {
    res.status(500).json({ error: "Failed to save plant." });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
