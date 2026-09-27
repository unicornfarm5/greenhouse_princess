/* Name: Plant card
  Responsibility: Display a plant and expose its edit and delete actions. */

import React from "react";

const DEFAULT_PLANT_IMAGE = "/plants/pixel_plant.png";

export default function PlantCard({ plant, onOpen }) {
  const imageSrc = plant?.picture || DEFAULT_PLANT_IMAGE;

  function handleCardClick(event) {
    if (event.target.closest("button, input, textarea, select, a")) {
      return;
    }

    onOpen?.(plant.id);
  }

  function handleCardKeyDown(event) {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen?.(plant.id);
    }
  }

  return (
    <article
      className="plant-card"
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Open profile for ${plant?.name || "plant"}`}
    >
      <img className="plant-card__image" src={imageSrc} alt={plant?.name || "Plant"} />
      <h3>Name: {plant?.name || "Unknown plant"}</h3>
      <p>Sort: {plant?.sort || "Unknown"}</p>
      <p>Water preference: {plant?.shouldBeWatered || "Not set"}</p>
      <p>Mood: {plant?.mood || "Not set"}</p>
    </article>
  );
}
