/* Name: Plant card
  Responsibility: Display a plant and expose its edit and delete actions. */

import React, { useState } from "react";
import EditPlantForm from "./EditPlantForm.jsx";

const DEFAULT_PLANT_IMAGE = "/plants/pixel_plant.png";

export default function PlantCard({ plant, onUpdate, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const imageSrc = plant?.picture || DEFAULT_PLANT_IMAGE;

  function handleSave(updatedPlant) {
    onUpdate?.(updatedPlant);
    setEditing(false);
    setMenuOpen(false);
  }

  function handleDelete() {
    if (!window.confirm("Delete this plant?")) {
      return;
    }

    onDelete?.(plant.id);
    setMenuOpen(false);
  }

  return (
    <article className="plant-card">
      <div className="plant-card__header">
        <div />
        {!menuOpen ? (
          <button type="button" className="plant-card__menu-button" onClick={() => setMenuOpen(true)} aria-label="Plant options">
            ⋯
          </button>
        ) : null}
      </div>

      {menuOpen ? (
        <div className="plant-card__menu">
          <button type="button" className="secondary-button" onClick={() => { setEditing(true); setMenuOpen(false); }}>Edit</button>
          <button type="button" className="secondary-button" onClick={handleDelete}>Delete</button>
          <button type="button" className="close-button" onClick={() => setMenuOpen(false)} aria-label="Close plant menu">X</button>
        </div>
      ) : null}

      {editing ? (
        <EditPlantForm
          plant={plant}
          onSave={handleSave}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          <img className="plant-card__image" src={imageSrc} alt={plant?.name || "Plant"} />
          <h3>Name: {plant?.name || "Unknown plant"}</h3>
          <p>Sort: {plant?.sort || "Unknown"}</p>
          <p>Water preference: {plant?.shouldBeWatered || "Not set"}</p>
          <p>Mood: {plant?.mood || "Not set"}</p>
        </>
      )}
    </article>
  );
}
