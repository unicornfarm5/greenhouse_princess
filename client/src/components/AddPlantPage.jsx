import React from "react";

export default function AddPlantPage({
  isOpen,
  newPlantInput,
  onInputChange,
  onSubmit,
  onClose,
  onImagePaste,
  imagePreview,
  imageStatus,
  submitError,
  isSubmitting,
  fieldLimits,
  isTemporaryMode
}) {
  // Read an image directly from clipboard and convert it to a data URL for preview/upload.
  function handlePaste(event) {
    const items = event.clipboardData?.items || [];
    const imageItem = Array.from(items).find((item) => item.type.startsWith("image/"));

    if (!imageItem) {
      onImagePaste({ error: "Clipboard does not contain an image." });
      return;
    }

    const file = imageItem.getAsFile();
    if (!file) {
      onImagePaste({ error: "Could not read image from clipboard." });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        onImagePaste({ error: "Invalid image data." });
        return;
      }

      onImagePaste({
        imageDataUrl: reader.result,
        status: `Image pasted (${file.type || "unknown type"}).`
      });
    };
    reader.onerror = () => onImagePaste({ error: "Failed to read pasted image." });
    reader.readAsDataURL(file);
  }

  if (!isOpen) {
    return null;
  }

  return (
    <section className="add-plant-modal-backdrop">
      <section className="add-plant-modal">
        <h2>Add a new plant</h2>
        {isTemporaryMode ? (
          <p className="paste-status">Demo mode: this flower only exists in your current tab and resets on refresh.</p>
        ) : null}
        <form className="add-plant-form" onSubmit={onSubmit}>
          <label htmlFor="name">Name</label>
          <input id="name" name="name" value={newPlantInput.name} onChange={onInputChange} maxLength={fieldLimits.name} required />

          <label htmlFor="sort">Sort</label>
          <input id="sort" name="sort" value={newPlantInput.sort} onChange={onInputChange} maxLength={fieldLimits.sort} required />

          <label htmlFor="shouldBeWatered">Water preference</label>
          <input
            id="shouldBeWatered"
            name="shouldBeWatered"
            value={newPlantInput.shouldBeWatered}
            onChange={onInputChange}
            maxLength={fieldLimits.shouldBeWatered}
            required
          />

          <label htmlFor="mood">Mood</label>
          <input id="mood" name="mood" value={newPlantInput.mood} onChange={onInputChange} maxLength={fieldLimits.mood} required />

          <label htmlFor="imageFileName">Image file name</label>
          <input
            id="imageFileName"
            name="imageFileName"
            value={newPlantInput.imageFileName}
            onChange={onInputChange}
            placeholder="my-new-plant"
            maxLength={fieldLimits.imageFileName}
            required
          />
          <p className="paste-status">Keep the file name short and simple. It will be sanitized on the server.</p>

          <label>Paste image</label>
          <section className="paste-zone" onPaste={handlePaste} tabIndex={0} role="button" aria-label="Paste image here">
            Click here and press Ctrl+V to paste a plant image
          </section>

          {imageStatus ? <p className="paste-status">{imageStatus}</p> : null}
          {imagePreview ? <img className="paste-preview" src={imagePreview} alt="Pasted plant preview" /> : null}
          {submitError ? <p className="state-message state-message--error">{submitError}</p> : null}

          <section className="add-plant-form__actions">
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isTemporaryMode ? "Create temporary plant" : "Create plant"}
            </button>
            <button type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
          </section>
        </form>
      </section>
    </section>
  );
}
