import React from "react";

export default function PlantCard({ plant }) {
  return (
    <article className="plant-card">
      <img className="plant-card__image" src={plant.picture} alt={plant.name} />
      <h3>Name: {plant.name}</h3>
      <p>Sort: {plant.sort}</p>
      <p>Water preference: {plant.shouldBeWatered}</p>
      <p>Mood: {plant.mood}</p>
    </article>
  );
}
