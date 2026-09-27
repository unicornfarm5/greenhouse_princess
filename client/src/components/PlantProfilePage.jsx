/* Name: Plant profile page
  Responsibility: Display all currently available information for one plant. */

import React, { useState } from "react";
import EditPlantForm from "./EditPlantForm.jsx";
import PlantUpdateForm from "./PlantUpdateForm.jsx";

const DEFAULT_PLANT_IMAGE = "/plants/pixel_plant.png";

function formatUpdateDate(createdAt) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(createdAt));
}

export default function PlantProfilePage({
  plant,
  isLoading,
  error,
  onBack,
  onUpdate,
  onDelete,
  updates,
  isLoadingUpdates,
  updatesError,
  onCreateUpdate
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [actionError, setActionError] = useState("");
  const [isUpdateFormOpen, setIsUpdateFormOpen] = useState(false);

  async function handleSave(updatedPlant) {
    setActionError("");

    try {
      await onUpdate?.(updatedPlant);
      setEditing(false);
      setMenuOpen(false);
    } catch (saveError) {
      setActionError(saveError.message || "Could not update plant.");
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this plant?")) {
      return;
    }

    setActionError("");

    try {
      await onDelete?.(plant.id);
    } catch (deleteError) {
      setActionError(deleteError.message || "Could not delete plant.");
    }
  }

  if (isLoading) {
    return (
      <main className="plant-profile-page">
        <p className="state-message">Loading plant...</p>
      </main>
    );
  }

  if (error || !plant) {
    return (
      <main className="plant-profile-page">
        <button type="button" className="secondary-button" onClick={onBack}>Back to garden</button>
        <p className="state-message state-message--error">{error || "Plant not found."}</p>
      </main>
    );
  }

  return (
    <main className="plant-profile-page">
      <button type="button" className="secondary-button plant-profile-page__back" onClick={onBack}>
        Back to garden
      </button>

      <article className="plant-profile">
        <img
          className="plant-profile__image"
          src={plant.picture || DEFAULT_PLANT_IMAGE}
          alt={plant.name || "Plant"}
        />

        <header className="plant-profile__header">
          <div className="plant-profile__heading-row">
            <div>
              <p className="hero__kicker">Plant profile</p>
              <h1>{plant.name || "Unknown plant"}</h1>
              <p className="plant-profile__sort">{plant.sort || "Unknown sort"}</p>
            </div>
            {!editing && !menuOpen ? (
              <button
                type="button"
                className="plant-profile__menu-button"
                onClick={() => setMenuOpen(true)}
                aria-label="Plant options"
              >
                ⋯
              </button>
            ) : null}
          </div>

          {menuOpen ? (
            <div className="plant-profile__menu">
              <button type="button" className="secondary-button" onClick={() => { setEditing(true); setMenuOpen(false); }}>
                Edit
              </button>
              <button type="button" className="secondary-button" onClick={handleDelete}>
                Delete
              </button>
              <button type="button" className="close-button" onClick={() => setMenuOpen(false)} aria-label="Close plant menu">
                X
              </button>
            </div>
          ) : null}
        </header>

        {editing ? (
          <div className="plant-profile__details">
            <EditPlantForm
              plant={plant}
              onSave={handleSave}
              onCancel={() => setEditing(false)}
            />
          </div>
        ) : (
          <section className="plant-profile__details" aria-label="Plant information">
            <div>
              <h2>Water preference</h2>
              <p>{plant.shouldBeWatered || "Not set"}</p>
            </div>
            <div>
              <h2>Mood</h2>
              <p>{plant.mood || "Not set"}</p>
            </div>
          </section>
        )}

        {actionError ? <p className="state-message state-message--error">{actionError}</p> : null}

        <section className="plant-updates" aria-label="Plant updates">
          <div className="plant-updates__header">
            <h2>Plant updates</h2>
            {!editing && !isUpdateFormOpen ? (
              <button type="button" className="secondary-button" onClick={() => setIsUpdateFormOpen(true)}>
                Update plant
              </button>
            ) : null}
          </div>

          {isUpdateFormOpen ? (
            <PlantUpdateForm
              onSubmit={async (updateInput) => {
                await onCreateUpdate(updateInput);
                setIsUpdateFormOpen(false);
              }}
              onCancel={() => setIsUpdateFormOpen(false)}
            />
          ) : null}

          {isLoadingUpdates ? <p className="state-message">Loading updates...</p> : null}
          {updatesError ? <p className="state-message state-message--error">{updatesError}</p> : null}
          {!isLoadingUpdates && !updatesError && updates.length === 0 && !isUpdateFormOpen ? (
            <p className="plant-updates__empty">No updates yet.</p>
          ) : null}

          <div className="plant-updates__feed">
            {updates.map((update) => (
              <article className="plant-update" key={update.id}>
                <time dateTime={update.createdAt}>{formatUpdateDate(update.createdAt)}</time>
                {update.potSizeCm ? <p><strong>Pot size:</strong> {update.potSizeCm} cm</p> : null}
                {update.dirtTypeNote ? <p><strong>Dirt type:</strong> {update.dirtTypeNote}</p> : null}
                {update.healthCheckNote ? <p><strong>Health check:</strong> {update.healthCheckNote}</p> : null}
                {update.otherNote ? <p><strong>Note:</strong> {update.otherNote}</p> : null}
              </article>
            ))}
          </div>
        </section>
      </article>
    </main>
  );
}