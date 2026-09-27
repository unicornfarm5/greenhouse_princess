/* Name: Plant update form
  Responsibility: Collect one dated update for a plant. */

import React, { useState } from "react";

const EMPTY_FORM = {
  potSizeCm: "",
  dirtTypeNote: "",
  healthCheckNote: "",
  otherNote: ""
};

function readImageFile(file, onRead, onError) {
  if (!file || !file.type.startsWith("image/")) {
    onError("Choose an image file.");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === "string") {
      onRead(reader.result);
    } else {
      onError("Could not read image.");
    }
  };
  reader.onerror = () => onError("Could not read image.");
  reader.readAsDataURL(file);
}

export default function PlantUpdateForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [imageStatus, setImageStatus] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;
    setError("");
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    readImageFile(
      file,
      (nextImage) => {
        setImageDataUrl(nextImage);
        setImageStatus("Photo ready to save.");
        setError("");
      },
      setError
    );
  }

  function handlePaste(event) {
    const imageItem = Array.from(event.clipboardData?.items || [])
      .find((item) => item.type.startsWith("image/"));
    const file = imageItem?.getAsFile();

    if (!file) {
      setError("Clipboard does not contain an image.");
      return;
    }

    readImageFile(
      file,
      (nextImage) => {
        setImageDataUrl(nextImage);
        setImageStatus("Pasted image ready to save.");
        setError("");
      },
      setError
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmedValues = {
      potSizeCm: form.potSizeCm.trim(),
      dirtTypeNote: form.dirtTypeNote.trim(),
      healthCheckNote: form.healthCheckNote.trim(),
      otherNote: form.otherNote.trim()
    };

    if (!Object.values(trimmedValues).some(Boolean) && !imageDataUrl) {
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
        otherNote: trimmedValues.otherNote,
        imageDataUrl: imageDataUrl || undefined
      });
      setForm(EMPTY_FORM);
      setImageDataUrl("");
      setImageStatus("");
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

      <label>
        Update picture
        <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} />
      </label>

      <div className="plant-update-form__paste" onPaste={handlePaste} tabIndex={0} role="button" aria-label="Paste an update image here">
        Click here and press Ctrl+V to paste an image
      </div>
      {imageStatus ? <p className="paste-status">{imageStatus}</p> : null}
      {imageDataUrl ? <img className="plant-update-form__preview" src={imageDataUrl} alt="Update preview" /> : null}

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