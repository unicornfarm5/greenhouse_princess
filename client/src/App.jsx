/* Name: Greenhouse application
  Responsibility: Coordinate authentication, profile state, plant state, and page-level flows. */

import React, { useEffect, useMemo, useState } from "react";
import {
  createPlant,
  deletePlant,
  fetchCurrentUser,
  fetchPlants,
  isLoggedIn,
  login,
  logout,
  signup,
  updatePlant,
  updateProfile
} from "./api.js";
import AddPlantPage from "./components/AddPlantPage.jsx";
import AuthPanel from "./components/AuthPanel.jsx";
import PlantCard from "./components/PlantCard.jsx";
import ProfilePanel from "./components/ProfilePanel.jsx";

const EMPTY_NEW_PLANT = {
  name: "",
  sort: "",
  shouldBeWatered: "",
  mood: ""
};

const FIELD_LIMITS = {
  name: 80,
  sort: 80,
  shouldBeWatered: 120,
  mood: 40
};

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
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [plants, setPlants] = useState([]);
  const [isLoadingPlants, setIsLoadingPlants] = useState(false);
  const [error, setError] = useState("");
  const [isAddPlantOpen, setIsAddPlantOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [newPlantInput, setNewPlantInput] = useState(EMPTY_NEW_PLANT);
  const [pastedImageDataUrl, setPastedImageDataUrl] = useState("");
  const [pasteStatus, setPasteStatus] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const footerPlantImage = `${import.meta.env.BASE_URL}plants/pixel_plant.png`;
  const loggedIn = useMemo(() => isLoggedIn(), [user]);

  useEffect(() => {
    const bootstrap = async () => {
      if (!isLoggedIn()) {
        setUser(null);
        setPlants([]);
        return;
      }

      try {
        const currentUser = await fetchCurrentUser();
        setUser(currentUser);
      } catch {
        setUser(null);
        logout();
      }
    };

    void bootstrap();
  }, []);

  useEffect(() => {
    if (!loggedIn) {
      setPlants([]);
      return;
    }

    async function loadPlants() {
      setIsLoadingPlants(true);
      setError("");

      try {
        const nextPlants = await fetchPlants();
        setPlants(nextPlants);
      } catch {
        setError("Could not load your plants.");
      } finally {
        setIsLoadingPlants(false);
      }
    }

    void loadPlants();
  }, [loggedIn]);

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
    setSubmitError("");
    setNewPlantInput((prev) => ({ ...prev, [name]: value }));
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

  async function handleNewPlantSubmit(event) {
    event.preventDefault();

    const nameError = validateClientTextField(newPlantInput.name, FIELD_LIMITS.name, "Name");
    const sortError = validateClientTextField(newPlantInput.sort, FIELD_LIMITS.sort, "Sort");
    const wateringError = validateClientTextField(newPlantInput.shouldBeWatered, FIELD_LIMITS.shouldBeWatered, "Water preference");
    const moodError = validateClientTextField(newPlantInput.mood, FIELD_LIMITS.mood, "Mood");

    if (nameError || sortError || wateringError || moodError) {
      setSubmitError(nameError || sortError || wateringError || moodError);
      return;
    }

    if (!pastedImageDataUrl) {
      setSubmitError("Paste an image before creating the plant.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const createdPlant = await createPlant({
        name: newPlantInput.name.trim(),
        sort: newPlantInput.sort.trim(),
        shouldBeWatered: newPlantInput.shouldBeWatered.trim(),
        mood: newPlantInput.mood.trim(),
        imageDataUrl: pastedImageDataUrl
      });

      setPlants((prev) => [...prev, createdPlant]);
      setIsAddPlantOpen(false);
      resetAddPlantState();
    } catch (submissionError) {
      setSubmitError(submissionError.message || "Could not create plant.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAuthSubmit(formValues) {
    setAuthError("");
    setAuthLoading(true);

    try {
      const nextUser = authMode === "login"
        ? await login({ email: formValues.email, password: formValues.password })
        : await signup({ name: formValues.name, email: formValues.email, password: formValues.password });

      setUser(nextUser);
      setAuthMode("login");
    } catch (submissionError) {
      setAuthError(submissionError.message || "Authentication failed.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleProfileSave(formValues) {
    setProfileError("");
    setProfileLoading(true);

    try {
      const nextUser = await updateProfile({
        name: formValues.name
      });

      setUser(nextUser);
    } catch (submissionError) {
      setProfileError(submissionError.message || "Could not save profile.");
    } finally {
      setProfileLoading(false);
    }
  }

  async function handlePlantUpdate(updatedPlant) {
    try {
      const nextPlant = await updatePlant(updatedPlant.id, {
        shouldBeWatered: updatedPlant.shouldBeWatered,
        mood: updatedPlant.mood,
        imageDataUrl: updatedPlant.picture && updatedPlant.picture.startsWith("data:") ? updatedPlant.picture : undefined
      });

      setPlants((prev) => prev.map((plant) => (plant.id === nextPlant.id ? nextPlant : plant)));
    } catch (submissionError) {
      setError(submissionError.message || "Could not update plant.");
    }
  }

  async function handlePlantDelete(plantId) {
    try {
      await deletePlant(plantId);
      setPlants((prev) => prev.filter((plant) => plant.id !== plantId));
    } catch (submissionError) {
      setError(submissionError.message || "Could not delete plant.");
    }
  }

  function handleLogout() {
    logout();
    setUser(null);
    setPlants([]);
    setIsProfileMenuOpen(false);
  }

  if (!loggedIn) {
    return (
      <main className="page auth-page">
        <section className="hero">
          <p className="hero__kicker">Greenhouse Princess</p>
          <h1>Your digital greenhouse</h1>
          <p className="hero__description">Sign in to keep your plants, profile and photos in one private garden.</p>
        </section>

        <AuthPanel
          mode={authMode}
          onSubmit={handleAuthSubmit}
          onSwitchMode={() => setAuthMode((prev) => (prev === "login" ? "signup" : "login"))}
          loading={authLoading}
          error={authError}
          submitLabel={authMode === "login" ? "Log in" : "Create account"}
        />
      </main>
    );
  }

  return (
    <main className="page">
      <header className="topbar">
        <div>
          <p className="hero__kicker">Greenhouse Princess</p>
          <h1>Your Digital Garden</h1>
        </div>

        <div className="topbar__actions">
          <button type="button" className="secondary-button" onClick={handleAddNewPlantClick}>Add plant</button>
          <div className="topbar__profile-menu">
            {!isProfileMenuOpen ? (
              <button
                type="button"
                className="secondary-button topbar__profile-trigger"
                onClick={() => setIsProfileMenuOpen(true)}
                aria-label="Open profile menu"
                aria-expanded={isProfileMenuOpen}
              >
                ⋯
              </button>
            ) : null}

            {isProfileMenuOpen ? (
              <section className="topbar__profile-dropdown">
                <button
                  type="button"
                  className="close-button"
                  onClick={() => setIsProfileMenuOpen(false)}
                  aria-label="Close profile menu"
                >
                  X
                </button>

                <div className="profile-summary">
                  <img id="profile-mascot" src="/plants/pink_pixel_plant.png" alt="Pixel flower mascot" />
                  <h2>Welcome back</h2>
                  <p>{user?.name}</p>
                  <p>{user?.email}</p>
                  <button type="button" className="secondary-button" onClick={handleLogout}>Log out</button>
                </div>

                <ProfilePanel user={user} onSave={handleProfileSave} loading={profileLoading} error={profileError} />
              </section>
            ) : null}
          </div>
        </div>
      </header>

      {error ? <p className="state-message state-message--error">{error}</p> : null}
      {isLoadingPlants ? <p className="state-message">Loading plants...</p> : null}

      <section className="plant-grid">
        {plants.map((plant) => (
          <PlantCard
            key={plant.id}
            plant={plant}
            onUpdate={handlePlantUpdate}
            onDelete={handlePlantDelete}
          />
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
        fieldLimits={FIELD_LIMITS}
        isTemporaryMode={false}
      />

       <footer className="hero-page-footer">
        <h2 className="page-footer__text">Made with love 🌱✨</h2>
        <h3 className="page-footer__text">Thank you for visiting! 🌷✨</h3>
        <a href="https://lineamoltved.com" target="_blank" rel="noopener noreferrer">Visit my portfolio</a>
        <img className="page-footer__image" src={footerPlantImage} alt="Pixel flower mascot" />
      </footer>

    </main>
  );
}
