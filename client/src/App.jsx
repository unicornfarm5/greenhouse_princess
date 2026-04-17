import React from "react";
import { useEffect, useState } from "react";
import { createPlant, fetchPlants } from "./api.js";
import PlantCard from "./components/PlantCard.jsx";
import AddPlantPage from "./components/AddPlantPage.jsx";

const EMPTY_NEW_PLANT = {
  name: "",
  sort: "",
  shouldBeWatered: "",
  mood: "",
  imageFileName: ""
};

export default function App() {
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

  function handleCloseAddPlantModal() {
    setIsAddPlantOpen(false);
    resetAddPlantState();
  }

  function handleNewPlantInputChange(event) {
    const { name, value } = event.target;
    setNewPlantInput((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  async function handleNewPlantSubmit(event) {
    event.preventDefault();

    if (!pastedImageDataUrl) {
      setSubmitError("Paste an image before creating the plant.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      // Send metadata + pasted image data URL to the API.
      const createdPlant = await createPlant({
        ...newPlantInput,
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

  useEffect(() => {
    async function loadPlants() {
      try {
        const nextPlants = await fetchPlants();
        setPlants(nextPlants);
      } catch {
        setError("Could not load plants.");
      }
    }

    void loadPlants();
  }, []);

  return (
    <main className="page">
      <h1>Greenhouse Princess</h1>

      <section className="hero-row">
        <section className="hero">
          <h1>Your Digital Garden</h1>
          <p className="hero__description">These are your first plants ! Feel free to explore🌷</p>
        </section>
        <button className="add-plant-button" type="button" onClick={handleAddNewPlantClick}>
          Add a new plant
        </button>
      </section>
      {error ? <p className="state-message state-message--error">{error}</p> : null}
      <section className="plant-grid">
        {plants.map((plant) => (
          <PlantCard key={plant.id} plant={plant} />
        ))}
      </section>

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
      />
    </main>
  );
}
