/* Name: Vite configuration
  Responsibility: Configure the client root and deployment base path. */

import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  root: "client",
  base: command === "build" ? "/greenhouse_princess/" : "/"
}));
