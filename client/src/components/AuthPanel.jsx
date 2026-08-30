import React, { useState } from "react";

export default function AuthPanel({ onSubmit, submitLabel, mode, onSwitchMode, loading, error }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await onSubmit(form);
  }

  return (
    <section className="auth-panel">
      <h2>{mode === "login" ? "Log in" : "Create account"}</h2>
      <form className="auth-form" onSubmit={handleSubmit}>
        {mode === "signup" ? (
          <label>
            Name
            <input name="name" value={form.name} onChange={handleChange} minLength={2} maxLength={80} required />
          </label>
        ) : null}

        <label>
          Email
          <input name="email" type="email" value={form.email} onChange={handleChange} required />
        </label>

        <label>
          Password
          <input name="password" type="password" value={form.password} onChange={handleChange} minLength={6} required />
        </label>

        {error ? <p className="state-message state-message--error">{error}</p> : null}

        <button type="submit" disabled={loading}>
          {loading ? "Please wait..." : submitLabel}
        </button>
      </form>

      <button type="button" className="link-button" onClick={onSwitchMode}>
        {mode === "login" ? "Need an account? Sign up" : "Already have an account? Log in"}
      </button>
    </section>
  );
}
