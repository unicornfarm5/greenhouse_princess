import React, { useEffect, useMemo, useState } from "react";
import {
  createPlant,
  fetchCurrentUser,
  fetchPlants,
  isLoggedIn,
  login,
  logout,
  signup,
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
  mood: "",
  imageFileName: ""
};

const FIELD_LIMITS = {
  name: 80,
  sort: 80,
  shouldBeWatered: 120,
  mood: 40,
  imageFileName: 120
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
  const [newPlantInput, setNewPlantInput] = useState(EMPTY_NEW_PLANT);
  const [pastedImageDataUrl, setPastedImageDataUrl] = useState("");
  const [pasteStatus, setPasteStatus] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const createdPlant = await createPlant({
        name: newPlantInput.name.trim(),
        sort: newPlantInput.sort.trim(),
        shouldBeWatered: newPlantInput.shouldBeWatered.trim(),
        mood: newPlantInput.mood.trim(),
        imageFileName: newPlantInput.imageFileName.trim(),
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
        name: formValues.name,
        avatarUrl: formValues.avatarUrl
      });

      setUser(nextUser);
    } catch (submissionError) {
      setProfileError(submissionError.message || "Could not save profile.");
    } finally {
      setProfileLoading(false);
    }
  }

  function handleLogout() {
    logout();
    setUser(null);
    setPlants([]);
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
          <button type="button" className="secondary-button" onClick={handleLogout}>Log out</button>
        </div>
      </header>

      <section className="dashboard">
        <ProfilePanel user={user} onSave={handleProfileSave} loading={profileLoading} error={profileError} />

        <section className="profile-summary">
          <h2>Welcome back</h2>
          <p>{user?.name}</p>
          <p>{user?.email}</p>
        </section>
      </section>

      {error ? <p className="state-message state-message--error">{error}</p> : null}
      {isLoadingPlants ? <p className="state-message">Loading plants...</p> : null}

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
        fieldLimits={FIELD_LIMITS}
        isTemporaryMode={false}
      />
    </main>
  );
}
