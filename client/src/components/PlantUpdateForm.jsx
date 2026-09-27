/* Name: Plant update form
  Responsibility: Collect one dated update for a plant. */

import React, { useState } from "react";

const EMPTY_FORM = {
  potSizeCm: "",
  dirtTypeNote: "",
  healthCheckNote: "",
  otherNote: ""
};

export default function PlantUpdateForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setError("");
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmedValues = {
      potSizeCm: form.potSizeCm.trim(),
      dirtTypeNote: form.dirtTypeNote.trim(),
      healthCheckNote: form.healthCheckNote.trim(),
      otherNote: form.otherNote.trim()
    };

    if (!Object.values(trimmedValues).some(Boolean)) {
      setError("Add at least one note to save an update.");
      return;
    }

    if (trimmedValues.potSizeCm && (!/^\d+$/.test(trimmedValues.potSizeCm) || Number(trimmedValues.potSizeCm) <= 0)) {
      setError("Pot size must be a positive whole number of centimeters.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await onSubmit({
        potSizeCm: trimmedValues.potSizeCm ? Number(trimmedValues.potSizeCm) : null,
        dirtTypeNote: trimmedValues.dirtTypeNote,
        healthCheckNote: trimmedValues.healthCheckNote,
        otherNote: trimmedValues.otherNote
      });
      setForm(EMPTY_FORM);
    } catch (submissionError) {
      setError(submissionError.message || "Could not save plant update.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="plant-update-form" onSubmit={handleSubmit}>
      <label>
        Pot size (cm)
        <input name="potSizeCm" type="number" min="1" step="1" value={form.potSizeCm} onChange={handleChange} />
      </label>

      <label>
        Dirt type
        <textarea name="dirtTypeNote" value={form.dirtTypeNote} onChange={handleChange} maxLength={500} rows="2" />
      </label>

      <label>
        Plant health check
        <textarea name="healthCheckNote" value={form.healthCheckNote} onChange={handleChange} maxLength={1000} rows="3" />
      </label>

      <label>
        Other note
        <textarea name="otherNote" value={form.otherNote} onChange={handleChange} maxLength={1000} rows="3" />
      </label>

      {error ? <p className="state-message state-message--error">{error}</p> : null}

      <div className="plant-update-form__actions">
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save update"}
        </button>
        <button type="button" className="secondary-button" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </button>
      </div>
    </form>
  );
}