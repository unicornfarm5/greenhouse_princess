/* Name: Edit plant form
  Responsibility: Collect editable plant preferences, mood, and pasted image data. */

import React, { useEffect, useState } from "react";

export default function EditPlantForm({ plant, onSave, onCancel }) {
  const [form, setForm] = useState({
    shouldBeWatered: plant?.shouldBeWatered || "",
    mood: plant?.mood || "",
    picture: plant?.picture || ""
  });

  useEffect(() => {
    setForm({
      shouldBeWatered: plant?.shouldBeWatered || "",
      mood: plant?.mood || "",
      picture: plant?.picture || ""
    });
  }, [plant]);

  function handleInputChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handlePaste(event) {
    const items = event.clipboardData?.items || [];
    const imageItem = Array.from(items).find((item) => item.type.startsWith("image/"));
    if (!imageItem) {
      return;
    }

    const file = imageItem.getAsFile();
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setForm((prev) => ({ ...prev, picture: reader.result }));
      }
    };
    reader.readAsDataURL(file);
  }

  function handleSubmit() {
    onSave?.({
      id: plant.id,
      shouldBeWatered: form.shouldBeWatered.trim(),
      mood: form.mood.trim(),
      picture: form.picture
    });
  }

  return (
    <div className="plant-card__edit-panel">
      <label>
        Water preference
        <input
          name="shouldBeWatered"
          value={form.shouldBeWatered}
          onChange={handleInputChange}
          maxLength={120}
        />
      </label>

      <label>
        Mood
        <input
          name="mood"
          value={form.mood}
          onChange={handleInputChange}
          maxLength={40}
        />
      </label>

      <div className="paste-zone" onPaste={handlePaste} tabIndex={0} role="button" aria-label="Paste image here">
        Click here and press Ctrl+V to replace the image
      </div>

      {form.picture ? <img className="paste-preview" src={form.picture} alt="Plant preview" /> : null}

      <div className="plant-card__edit-actions">
        <button type="button" className="secondary-button"onClick={handleSubmit}>Save changes</button>
        <button type="button" className="secondary-button" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
