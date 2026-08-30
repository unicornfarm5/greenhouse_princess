const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";

function getToken() {
  return localStorage.getItem("greenhouse_princess_token");
}

function buildHeaders(extraHeaders = {}) {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...extraHeaders,
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export function isTemporaryFlowersMode() {
  if (import.meta.env.VITE_TEMP_FLOWERS_MODE === "true") {
    return true;
  }

  if (import.meta.env.VITE_TEMP_FLOWERS_MODE === "false") {
    return false;
  }

  return false;
}

export function isLoggedIn() {
  return Boolean(getToken());
}

export async function signup({ name, email, password }) {
  const response = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({ name, email, password })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Could not sign up.");
  }

  localStorage.setItem("greenhouse_princess_token", payload.token);
  return payload.user;
}

export async function login({ email, password }) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({ email, password })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Could not log in.");
  }

  localStorage.setItem("greenhouse_princess_token", payload.token);
  return payload.user;
}

export function logout() {
  localStorage.removeItem("greenhouse_princess_token");
}

export async function fetchCurrentUser() {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: buildHeaders()
  });

  if (!response.ok) {
    throw new Error("Could not load profile.");
  }

  const payload = await response.json();
  return payload.user;
}

export async function updateProfile(profile) {
  const response = await fetch(`${API_BASE_URL}/profile`, {
    method: "PATCH",
    headers: buildHeaders(),
    body: JSON.stringify(profile)
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Could not update profile.");
  }

  return payload.user;
}

export async function fetchPlants() {
  const response = await fetch(`${API_BASE_URL}/plants`, {
    headers: buildHeaders()
  });

  if (!response.ok) {
    throw new Error("Could not load plants.");
  }

  const payload = await response.json();
  return payload.plants;
}

export async function createPlant(plantInput) {
  const response = await fetch(`${API_BASE_URL}/plants`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(plantInput)
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Could not create plant.");
  }

  return payload.plant;
}

export async function updatePlant(plantId, plantInput) {
  const response = await fetch(`${API_BASE_URL}/plants/${plantId}`, {
    method: "PATCH",
    headers: buildHeaders(),
    body: JSON.stringify(plantInput)
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Could not update plant.");
  }

  return payload.plant;
}

export async function deletePlant(plantId) {
  const response = await fetch(`${API_BASE_URL}/plants/${plantId}`, {
    method: "DELETE",
    headers: buildHeaders()
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Could not delete plant.");
  }

  return payload;
}
