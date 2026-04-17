import cors from "cors";
import express from "express";

const app = express();
const port = 3001;

class Plant {
  constructor({ id, name, sort, shouldBeWatered, mood, picture }) {
    this.id = id;
    this.name = name;
    this.sort = sort;
    this.shouldBeWatered = shouldBeWatered;
    this.mood = mood;
    this.picture = picture;
  }
}

const plants = [
  new Plant({
    id: 1,
    name: "Luna",
    sort: "devil's ivy",
    shouldBeWatered: "Every 2 days",
    mood: "Thriving",
    picture: "/plants/devilsivy.png"
  }),
  new Plant({
    id: 2,
    name: "Mossy",
    sort: "philodendron",
    shouldBeWatered: "Every 4 days",
    mood: "Happy",
    picture: "/plants/philodendron.png"
  }),
  new Plant({
    id: 3,
    name: "Rosie",
    sort: "flamingo flower",
    shouldBeWatered: "Every 2 days",
    mood: "Blooming",
    picture: "/plants/flamingoflower.png"
  })
];

app.use(cors());
app.use(express.json());

app.get("/api/all_plants", (_req, res) => {
  res.json({ plants });
});

app.get("/api/id/:id", (req, res) => {
  const plant = plants.find((item) => item.id === parseInt(req.params.id));

  if (!plant) {
    res.status(404).json({ error: "Plant not found." });
    return;
  }

  res.json({ plant });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
