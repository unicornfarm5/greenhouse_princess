import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  root: "client",
  base: command === "build" ? "/greenhouse_princess/" : "/"
}));
