const API_BASE_URL = "http://localhost:3001/api";

export async function fetchPlants() {
  const response = await fetch(`${API_BASE_URL}/all_plants`);

  if (!response.ok) {
    throw new Error("Could not load plants.");
  }

  const payload = await response.json();
  return payload.plants;
}
