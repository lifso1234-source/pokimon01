import "reflect-metadata";
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { AppDataSource } from "./data-source";
import apiRoutes from "./routes";

const app = express();

// 1. Core middleware (must come before routes & error handlers so req.log and req.id exist)
app.use(pinoHttp());
app.use(cors());
app.use(express.json());

// 2. Health check & API routes
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", apiRoutes);

// 3. 404 & Global error handlers (must be registered AFTER all routes)
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 3000;

AppDataSource.initialize()
  .then(() => {
    console.log("Database connected (schema: poke)");
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("DB connection error:", err);
    process.exit(1);
  });