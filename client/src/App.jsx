import React from "react";
import { useEffect, useState } from "react";
import { fetchPlants } from "./api.js";
import PlantCard from "./components/PlantCard.jsx";
import AddPlantPage from "./components/AddPlantPage.jsx";

export default function App() {
  const [plants, setPlants] = useState([]);
  const [error, setError] = useState("");
  const [isAddPlantOpen, setIsAddPlantOpen] = useState(false);
  const [newPlantInput, setNewPlantInput] = useState({
    name: "",
    sort: "",
    shouldBeWatered: "",
    mood: "",
    picture: ""
  });

  function handleAddNewPlantClick() {
    setIsAddPlantOpen(true);
  }

  function handleCloseAddPlantModal() {
    setIsAddPlantOpen(false);
  }

  function handleNewPlantInputChange(event) {
    const { name, value } = event.target;
    setNewPlantInput((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  function handleNewPlantSubmit(event) {
    event.preventDefault();
    console.log("New plant input:", newPlantInput);
    setIsAddPlantOpen(false);
  }

  useEffect(() => {
    async function loadPlants() {
      try {
        const nextPlants = await fetchPlants();
        setPlants(nextPlants);
      } catch {
        setError("Could not load plants.");
      }
    }

    void loadPlants();
  }, []);

  return (
    <main className="page">
      <h1>Greenhouse Princess</h1>

      <section className="hero-row">
        <section className="hero">
          <h1>Your Digital Garden</h1>
          <p className="hero__description">These are your first plants ! Feel free to explore🌷</p>
        </section>
        <button className="add-plant-button" type="button" onClick={handleAddNewPlantClick}>
          Add a new plant
        </button>
      </section>
      {error ? <p className="state-message state-message--error">{error}</p> : null}
      <section className="plant-grid">
        {plants.map((plant) => (
          <PlantCard key={plant.id} plant={plant} />
        ))}
      </section>

      <AddPlantPage
        isOpen={isAddPlantOpen}
        newPlantInput={newPlantInput}
        onInputChange={handleNewPlantInputChange}
        onSubmit={handleNewPlantSubmit}
        onClose={handleCloseAddPlantModal}
      />
    </main>
  );
}
