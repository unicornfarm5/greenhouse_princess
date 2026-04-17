const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";

function isLocalhostHostName(hostName) {
  return hostName === "localhost" || hostName === "127.0.0.1";
}

export function isTemporaryFlowersMode() {
  // Allow explicit override from env when needed.
  if (import.meta.env.VITE_TEMP_FLOWERS_MODE === "true") {
    return true;
  }

  if (import.meta.env.VITE_TEMP_FLOWERS_MODE === "false") {
    return false;
  }

  const hostName = typeof window === "undefined" ? "" : window.location.hostname;
  return !isLocalhostHostName(hostName);
}

export async function fetchPlants() {
  const response = await fetch(`${API_BASE_URL}/all_plants`);

  if (!response.ok) {
    throw new Error("Could not load plants.");
  }

  const payload = await response.json();
  return payload.plants;
}

export async function createPlant(plantInput) {
  const response = await fetch(`${API_BASE_URL}/plants`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(plantInput)
  });

  if (!response.ok) {
    throw new Error("Could not create plant.");
  }

  const payload = await response.json();
  return payload.plant;
}
