function publicPlantImage(fileName) {
  return `${import.meta.env.BASE_URL}plants/${fileName}`;
}

export const DEFAULT_PLANTS = [
  {
    id: 1,
    name: "Luna",
    sort: "devil's ivy",
    shouldBeWatered: "Every 2 days",
    mood: "Thriving",
    picture: publicPlantImage("devilsivy.png")
  },
  {
    id: 2,
    name: "Mossy",
    sort: "philodendron",
    shouldBeWatered: "Every 4 days",
    mood: "Happy",
    picture: publicPlantImage("philodendron.png")
  },
  {
    id: 3,
    name: "Rosie",
    sort: "flamingo flower",
    shouldBeWatered: "Every 2 days",
    mood: "Blooming",
    picture: publicPlantImage("flamingoflower.png")
  },
  {
    id: 4,
    name: "Lilly",
    sort: "English peacy lilly",
    shouldBeWatered: "once a week",
    mood: "Happy:)",
    picture: publicPlantImage("lilly.png")
  }
];
