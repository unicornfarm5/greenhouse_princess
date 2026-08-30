/* Name: Express server bootstrap
  Responsibility: Configure middleware, initialize PostgreSQL, and register API routers. */

import cors from "cors";
import express from "express";
import helmet from "helmet";
import { hasDatabase, initializeDatabase } from "./db.js";
import authRouter from "./routes/authRoutes.js";
import plantRouter from "./routes/plantRoutes.js";

const app = express();
const port = 3001;

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("CORS not allowed"));
    }
  })
);
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api/plants", plantRouter);

async function startServer() {
  try {
    const databaseInitialized = await initializeDatabase();
    if (!databaseInitialized || !hasDatabase()) {
      throw new Error("DATABASE_URL is not configured.");
    }

    console.log("Connected to PostgreSQL database.");
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error(`Database initialization failed: ${error.message}`);
    process.exitCode = 1;
  }
}

startServer();
