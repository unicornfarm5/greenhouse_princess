const API_BASE_URL = "http://localhost:3001/api";

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
