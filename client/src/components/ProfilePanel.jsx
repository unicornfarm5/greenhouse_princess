import React, { useState } from "react";

export default function ProfilePanel({ user, onSave, loading, error }) {
  const [form, setForm] = useState({
    name: user?.name || "",
    avatarUrl: user?.avatarUrl || ""
  });

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await onSave(form);
  }

  return (
    <section className="profile-panel">
      <h2>Your profile</h2>
      <form className="profile-form" onSubmit={handleSubmit}>
        <label>
          Name
          <input name="name" value={form.name} onChange={handleChange} maxLength={80} required />
        </label>

        <label>
          Avatar URL
          <input name="avatarUrl" value={form.avatarUrl} onChange={handleChange} placeholder="https://..." />
        </label>

        {error ? <p className="state-message state-message--error">{error}</p> : null}

        <button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save profile"}
        </button>
      </form>
    </section>
  );
}
