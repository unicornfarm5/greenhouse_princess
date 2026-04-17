import React from "react";

export default function AddPlantPage({ isOpen, newPlantInput, onInputChange, onSubmit, onClose }) {
  if (!isOpen) {
    return null;
  }

  return (
    <section className="add-plant-modal-backdrop">
      <section className="add-plant-modal">
        <h2>Add a new plant</h2>
        <form className="add-plant-form" onSubmit={onSubmit}>
          <label htmlFor="name">Name</label>
          <input id="name" name="name" value={newPlantInput.name} onChange={onInputChange} required />

          <label htmlFor="sort">Sort</label>
          <input id="sort" name="sort" value={newPlantInput.sort} onChange={onInputChange} required />

          <label htmlFor="shouldBeWatered">Water preference</label>
          <input
            id="shouldBeWatered"
            name="shouldBeWatered"
            value={newPlantInput.shouldBeWatered}
            onChange={onInputChange}
            required
          />

          <label htmlFor="mood">Mood</label>
          <input id="mood" name="mood" value={newPlantInput.mood} onChange={onInputChange} required />

          <label htmlFor="picture">Picture path</label>
          <input
            id="picture"
            name="picture"
            value={newPlantInput.picture}
            onChange={onInputChange}
            placeholder="/plants/new-plant.png"
            required
          />

          <section className="add-plant-form__actions">
            <button type="submit">Log input</button>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
          </section>
        </form>
      </section>
    </section>
  );
}
