/* Name: Plant routes
  Responsibility: Handle authenticated plant listing, creation, editing, and deletion. */

import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  createPlantUpdate,
  createPlant,
  deletePlantById,
  listAllPlants,
  listPlantUpdatesByUser,
  listPlantsByUser,
  updatePlantById
} from "../db.js";
import { requireAuth } from "../middleware.js";
import { FIELD_LIMITS, validateTextField } from "../validation.js";

const router = Router();
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const UPDATE_FIELD_LIMITS = {
  dirtTypeNote: 500,
  healthCheckNote: 1000,
  otherNote: 1000
};

const plantCreationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false
});

function validateImageMagicBytes(binary, extension) {
  if (extension === "png") {
    return binary.length >= 4 && binary[0] === 0x89 && binary[1] === 0x50 && binary[2] === 0x4e && binary[3] === 0x47;
  }

  if (extension === "jpg") {
    return binary.length >= 3 && binary[0] === 0xff && binary[1] === 0xd8 && binary[2] === 0xff;
  }

  return binary.length >= 12 && binary[0] === 0x52 && binary[1] === 0x49 && binary[2] === 0x46 && binary[3] === 0x46
    && binary[8] === 0x57 && binary[9] === 0x45 && binary[10] === 0x42 && binary[11] === 0x50;
}

function parseDataUrl(dataUrl) {
  const match = /^data:(image\/(png|jpeg|webp));base64,(.+)$/i.exec(dataUrl || "");
  if (!match) {
    return null;
  }

  const encodedData = match[3];
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encodedData)) {
    return null;
  }

  const mimeType = match[1].toLowerCase();
  const extension = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" }[mimeType];

  try {
    const binary = Buffer.from(encodedData, "base64");
    if (binary.length === 0 || binary.length > MAX_IMAGE_BYTES || !validateImageMagicBytes(binary, extension)) {
      return null;
    }
    return { extension, binary, mimeType };
  } catch {
    return null;
  }
}

function toPublicPlant(plant) {
  return {
    id: plant.id,
    userId: plant.userId,
    name: plant.name,
    sort: plant.plantType,
    shouldBeWatered: plant.wateringText,
    mood: plant.mood,
    picture: plant.imageData ? `data:${plant.imageMime};base64,${Buffer.from(plant.imageData).toString("base64")}` : null
  };
}

function toPublicPlantUpdate(update) {
  return {
    id: update.id,
    plantId: update.plantId,
    potSizeCm: update.potSizeCm,
    dirtTypeNote: update.dirtTypeNote,
    healthCheckNote: update.healthCheckNote,
    otherNote: update.otherNote,
    picture: update.imageData
      ? `data:${update.imageMime};base64,${Buffer.from(update.imageData).toString("base64")}`
      : null,
    createdAt: update.createdAt
  };
}

router.use(requireAuth);

router.get("/", async (req, res) => {
  const plantRows = await listPlantsByUser(Number(req.user.id));
  res.json({ plants: plantRows.map(toPublicPlant) });
});

router.get("/all", async (req, res) => {
  const plantRows = await listAllPlants();
  res.json({ plants: plantRows.map(toPublicPlant) });
});

router.get("/:id/updates", async (req, res) => {
  const plantId = Number(req.params.id);
  if (!Number.isInteger(plantId)) {
    res.status(400).json({ error: "Invalid plant id." });
    return;
  }

  const plantRows = await listPlantsByUser(Number(req.user.id));
  if (!plantRows.some((plant) => plant.id === plantId)) {
    res.status(404).json({ error: "Plant not found." });
    return;
  }

  const updates = await listPlantUpdatesByUser({
    plantId,
    userId: Number(req.user.id)
  });
  res.json({ updates: updates.map(toPublicPlantUpdate) });
});

router.get("/:id", async (req, res) => {
  const plantId = Number(req.params.id);
  if (!Number.isInteger(plantId)) {
    res.status(400).json({ error: "Invalid plant id." });
    return;
  }

  const plantRows = await listPlantsByUser(Number(req.user.id));
  const plant = plantRows.find((item) => item.id === plantId);
  if (!plant) {
    res.status(404).json({ error: "Plant not found." });
    return;
  }

  res.json({ plant: toPublicPlant(plant) });
});

router.post("/", plantCreationLimiter, async (req, res) => {
  const { name, sort, shouldBeWatered, mood, imageDataUrl } = req.body || {};
  const validatedName = validateTextField(name, FIELD_LIMITS.name);
  const validatedSort = validateTextField(sort, FIELD_LIMITS.sort);
  const validatedWatering = validateTextField(shouldBeWatered, FIELD_LIMITS.shouldBeWatered);
  const validatedMood = validateTextField(mood, FIELD_LIMITS.mood);

  if (!validatedName || !validatedSort || !validatedWatering || !validatedMood || !imageDataUrl) {
    res.status(400).json({ error: "Missing required fields." });
    return;
  }

  const parsedImage = parseDataUrl(imageDataUrl);
  if (!parsedImage) {
    res.status(400).json({ error: "Invalid image format. Use pasted png, jpeg or webp image." });
    return;
  }

  try {
    const plant = await createPlant({
      userId: Number(req.user.id),
      name: validatedName,
      plantType: validatedSort,
      wateringText: validatedWatering,
      mood: validatedMood,
      imageData: parsedImage.binary,
      imageMime: parsedImage.mimeType,
      imageName: `plant-${Date.now()}.${parsedImage.extension}`
    });
    res.status(201).json({ plant: toPublicPlant(plant) });
  } catch {
    res.status(500).json({ error: "Failed to save plant." });
  }
});

router.post("/:id/updates", async (req, res) => {
  const plantId = Number(req.params.id);
  if (!Number.isInteger(plantId)) {
    res.status(400).json({ error: "Invalid plant id." });
    return;
  }

  const { potSizeCm, dirtTypeNote, healthCheckNote, otherNote, imageDataUrl } = req.body || {};
  let validatedPotSize = null;

  if (potSizeCm !== undefined && potSizeCm !== null && potSizeCm !== "") {
    validatedPotSize = Number(potSizeCm);
    if (!Number.isInteger(validatedPotSize) || validatedPotSize <= 0) {
      res.status(400).json({ error: "Pot size must be a positive whole number of centimeters." });
      return;
    }
  }

  const validatedDirtType = dirtTypeNote ? validateTextField(dirtTypeNote, UPDATE_FIELD_LIMITS.dirtTypeNote) : null;
  const validatedHealthCheck = healthCheckNote ? validateTextField(healthCheckNote, UPDATE_FIELD_LIMITS.healthCheckNote) : null;
  const validatedOtherNote = otherNote ? validateTextField(otherNote, UPDATE_FIELD_LIMITS.otherNote) : null;

  if ((dirtTypeNote && !validatedDirtType) || (healthCheckNote && !validatedHealthCheck) || (otherNote && !validatedOtherNote)) {
    res.status(400).json({ error: "Update notes contain invalid text." });
    return;
  }

  if (validatedPotSize === null && !validatedDirtType && !validatedHealthCheck && !validatedOtherNote) {
    if (!imageDataUrl) {
      res.status(400).json({ error: "Add at least one plant update." });
      return;
    }
  }

  let parsedImage = null;
  if (imageDataUrl) {
    parsedImage = parseDataUrl(imageDataUrl);
    if (!parsedImage) {
      res.status(400).json({ error: "Invalid image format. Use png, jpeg or webp image." });
      return;
    }
  }

  if (validatedPotSize === null && !validatedDirtType && !validatedHealthCheck && !validatedOtherNote && !parsedImage) {
    res.status(400).json({ error: "Add at least one plant update." });
    return;
  }

  const update = await createPlantUpdate({
    plantId,
    userId: Number(req.user.id),
    potSizeCm: validatedPotSize,
    dirtTypeNote: validatedDirtType,
    healthCheckNote: validatedHealthCheck,
    otherNote: validatedOtherNote,
    imageData: parsedImage?.binary,
    imageMime: parsedImage?.mimeType
  });

  if (!update) {
    res.status(404).json({ error: "Plant not found." });
    return;
  }

  res.status(201).json({ update: toPublicPlantUpdate(update) });
});

router.patch("/:id", async (req, res) => {
  const plantId = Number(req.params.id);
  if (!Number.isInteger(plantId)) {
    res.status(400).json({ error: "Invalid plant id." });
    return;
  }

  const { shouldBeWatered, mood, imageDataUrl } = req.body || {};
  const updateData = {};

  if (shouldBeWatered !== undefined) {
    updateData.wateringText = validateTextField(shouldBeWatered, FIELD_LIMITS.shouldBeWatered);
    if (!updateData.wateringText) {
      res.status(400).json({ error: "A valid water preference is required." });
      return;
    }
  }

  if (mood !== undefined) {
    updateData.mood = validateTextField(mood, FIELD_LIMITS.mood);
    if (!updateData.mood) {
      res.status(400).json({ error: "A valid mood is required." });
      return;
    }
  }

  if (imageDataUrl !== undefined && imageDataUrl !== null && imageDataUrl !== "") {
    const parsedImage = parseDataUrl(imageDataUrl);
    if (!parsedImage) {
      res.status(400).json({ error: "Invalid image format. Use pasted png, jpeg or webp image." });
      return;
    }
    updateData.imageData = parsedImage.binary;
    updateData.imageMime = parsedImage.mimeType;
    updateData.imageName = `plant-${plantId}.${parsedImage.extension}`;
  }

  if (Object.keys(updateData).length === 0) {
    res.status(400).json({ error: "No changes provided." });
    return;
  }

  const plant = await updatePlantById({ id: plantId, userId: Number(req.user.id), ...updateData });
  if (!plant) {
    res.status(404).json({ error: "Plant not found." });
    return;
  }

  res.json({ plant: toPublicPlant(plant) });
});

router.delete("/:id", async (req, res) => {
  const plantId = Number(req.params.id);
  if (!Number.isInteger(plantId)) {
    res.status(400).json({ error: "Invalid plant id." });
    return;
  }

  const deleted = await deletePlantById(plantId, Number(req.user.id));
  if (!deleted) {
    res.status(404).json({ error: "Plant not found." });
    return;
  }

  res.json({ success: true, id: plantId });
});

export default router;
