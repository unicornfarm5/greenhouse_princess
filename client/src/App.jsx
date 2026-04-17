import React from "react";
import { useEffect, useState } from "react";
import { createPlant, fetchPlants, isTemporaryFlowersMode } from "./api.js";
import { DEFAULT_PLANTS } from "./defaultPlants.js";
import PlantCard from "./components/PlantCard.jsx";
import AddPlantPage from "./components/AddPlantPage.jsx";

const EMPTY_NEW_PLANT = {
  name: "",
  sort: "",
  shouldBeWatered: "",
  mood: "",
  imageFileName: ""
};

// Keep the client aligned with the server so we catch invalid input early.
const FIELD_LIMITS = {
  name: 80,
  sort: 80,
  shouldBeWatered: 120,
  mood: 40,
  imageFileName: 120
};

// Small client-side guardrails for a cleaner form experience.
function validateClientTextField(value, maxLength, label) {
  if (typeof value !== "string") {
    return `${label} must be text.`;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return `${label} is required.`;
  }

  if (trimmed.length > maxLength) {
    return `${label} must be ${maxLength} characters or fewer.`;
  }

  return "";
}

export default function App() {
  const temporaryFlowersMode = isTemporaryFlowersMode();

  // Main list state and modal state live here so the page stays predictable.
  const [plants, setPlants] = useState([]);
  const [error, setError] = useState("");
  const [isAddPlantOpen, setIsAddPlantOpen] = useState(false);
  const [newPlantInput, setNewPlantInput] = useState(EMPTY_NEW_PLANT);
  const [pastedImageDataUrl, setPastedImageDataUrl] = useState("");
  const [pasteStatus, setPasteStatus] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset modal state to avoid stale text/image when reopening.
  function resetAddPlantState() {
    setNewPlantInput(EMPTY_NEW_PLANT);
    setPastedImageDataUrl("");
    setPasteStatus("");
    setSubmitError("");
    setIsSubmitting(false);
  }

  function handleAddNewPlantClick() {
    setIsAddPlantOpen(true);
    setSubmitError("");
  }

  // Close the modal and clear all temporary form data.
  function handleCloseAddPlantModal() {
    setIsAddPlantOpen(false);
    resetAddPlantState();
  }

  // Keep the form state controlled so validation can run before submit.
  function handleNewPlantInputChange(event) {
    const { name, value } = event.target;
    setSubmitError("");
    setNewPlantInput((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  // Validate locally, then send the cleaned payload to the API.
  async function handleNewPlantSubmit(event) {
    event.preventDefault();

    const nameError = validateClientTextField(newPlantInput.name, FIELD_LIMITS.name, "Name");
    const sortError = validateClientTextField(newPlantInput.sort, FIELD_LIMITS.sort, "Sort");
    const wateringError = validateClientTextField(
      newPlantInput.shouldBeWatered,
      FIELD_LIMITS.shouldBeWatered,
      "Water preference"
    );
    const moodError = validateClientTextField(newPlantInput.mood, FIELD_LIMITS.mood, "Mood");
    const fileNameError = validateClientTextField(newPlantInput.imageFileName, FIELD_LIMITS.imageFileName, "Image file name");

    if (nameError || sortError || wateringError || moodError || fileNameError) {
      setSubmitError(nameError || sortError || wateringError || moodError || fileNameError);
      return;
    }

    if (!pastedImageDataUrl) {
      setSubmitError("Paste an image before creating the plant.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const normalizedPlant = {
        name: newPlantInput.name.trim(),
        sort: newPlantInput.sort.trim(),
        shouldBeWatered: newPlantInput.shouldBeWatered.trim(),
        mood: newPlantInput.mood.trim(),
        imageFileName: newPlantInput.imageFileName.trim()
      };

      if (temporaryFlowersMode) {
        const temporaryPlant = {
          id: `temp-${Date.now()}-${Math.round(Math.random() * 10000)}`,
          ...normalizedPlant,
          picture: pastedImageDataUrl
        };

        setPlants((prev) => [...prev, temporaryPlant]);
        setIsAddPlantOpen(false);
        resetAddPlantState();
        return;
      }

      // Send metadata + pasted image data URL to the API.
      const createdPlant = await createPlant({
        ...normalizedPlant,
        imageDataUrl: pastedImageDataUrl
      });

      // Optimistically append so the new card appears immediately.
      setPlants((prev) => [...prev, createdPlant]);
      setIsAddPlantOpen(false);
      resetAddPlantState();
    } catch {
      setSubmitError("Could not create plant.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Convert a pasted clipboard image into previewable/uploadable data.
  function handleImagePaste(payload) {
    if (payload.error) {
      setPastedImageDataUrl("");
      setPasteStatus(payload.error);
      return;
    }

    setPastedImageDataUrl(payload.imageDataUrl || "");
    setPasteStatus(payload.status || "Image pasted.");
    setSubmitError("");
  }

  // Load the initial plant list once when the app starts.
  useEffect(() => {
    if (temporaryFlowersMode) {
      setPlants(DEFAULT_PLANTS);
      setError("");
      return;
    }

    async function loadPlants() {
      try {
        const nextPlants = await fetchPlants();
        setPlants(nextPlants);
      } catch {
        setError("Could not load plants.");
      }
    }

    void loadPlants();
  }, [temporaryFlowersMode]);

  return (
    <main className="page">
      <h1>Greenhouse Princess</h1>

      {/* Hero section and action button stay together as the page header. */}
      <section className="hero-row">
        <section className="hero">
          <h1>Your Digital Garden</h1>
          <p className="hero__description">These are your first plants ! Feel free to explore🌷</p>
        </section>
        <button className="add-plant-button" type="button" onClick={handleAddNewPlantClick}>
          {temporaryFlowersMode ? "Add a temporary plant" : "Add a new plant"}
        </button>
      </section>
      {temporaryFlowersMode ? (
        <p className="state-message">Demo mode: new flowers are only saved in your current tab and disappear after refresh.</p>
      ) : null}
      {error ? <p className="state-message state-message--error">{error}</p> : null}

      {/* Render the current collection of plants as cards. */}
      <section className="plant-grid">
        {plants.map((plant) => (
          <PlantCard key={plant.id} plant={plant} />
        ))}
      </section>

      {/* Modal lives outside the grid so it can open/close independently. */}
      <AddPlantPage
        isOpen={isAddPlantOpen}
        newPlantInput={newPlantInput}
        onInputChange={handleNewPlantInputChange}
        onSubmit={handleNewPlantSubmit}
        onClose={handleCloseAddPlantModal}
        onImagePaste={handleImagePaste}
        imagePreview={pastedImageDataUrl}
        imageStatus={pasteStatus}
        submitError={submitError}
        isSubmitting={isSubmitting}
        fieldLimits={FIELD_LIMITS}
        isTemporaryMode={temporaryFlowersMode}
      />
    </main>
  );
}
