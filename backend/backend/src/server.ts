import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db";

import authRoutes from "./routes/auth.routes";
import usersRoutes from "./routes/users.routes";
import locationsRoutes from "./routes/locations.routes";
import predictionsRoutes from "./routes/predictions.routes";
import incidentsRoutes from "./routes/incidents.routes";
import alertsRoutes from "./routes/alerts.routes";
import taskforcesRoutes from "./routes/taskforces.routes";
import roadsRoutes from "./routes/roads.routes";
import infrastructureRoutes from "./routes/infrastructure.routes";
import populationRoutes from "./routes/population.routes";
import sosRoutes from "./routes/sos.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import assistantRoutes from "./routes/assistant.routes";

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.get("/api/health", (_req, res) => res.json({ success: true, message: "SIH Landslide backend running" }));

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/locations", locationsRoutes);
app.use("/api/predictions", predictionsRoutes);
app.use("/api/incidents", incidentsRoutes);
app.use("/api/alerts", alertsRoutes);
app.use("/api/taskforces", taskforcesRoutes);
app.use("/api/roads", roadsRoutes);
app.use("/api/infrastructure", infrastructureRoutes);
app.use("/api/population", populationRoutes);
app.use("/api/sos", sosRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/assistant", assistantRoutes);

// 404 handler
app.use((_req, res) => res.status(404).json({ success: false, message: "Route not found" }));

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`[server] listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error("[server] failed to connect to MongoDB", err);
    process.exit(1);
  });
