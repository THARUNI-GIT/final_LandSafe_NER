import mongoose, { Schema, Types } from "mongoose";

/* ---------------- ENUMS ---------------- */
export const ROLES = ["CITIZEN", "DISTRICT_ADMIN", "STATE_ADMIN", "CENTRAL_ADMIN"] as const;
export const SEVERITY = ["LOW", "MODERATE", "HIGH", "CRITICAL"] as const;
export const INCIDENT_STATUS = ["PENDING", "VERIFIED", "REJECTED", "RESOLVED"] as const;
export const ROAD_STATUS = ["OPEN", "BLOCKED", "DAMAGED"] as const;
export const INFRA_STATUS = ["OPERATIONAL", "DAMAGED", "DESTROYED"] as const;
export const INFRA_TYPE = ["HOSPITAL", "SCHOOL", "BRIDGE", "POWER", "SHELTER", "GOVT_OFFICE"] as const;
export const TASKFORCE_TYPE = ["NDRF", "SDRF", "MEDICAL", "ENGINEERING", "POLICE"] as const;
export const TASKFORCE_STATUS = ["AVAILABLE", "DEPLOYED", "UNAVAILABLE"] as const;
export const SOS_STATUS = ["PENDING", "ACKNOWLEDGED", "DISPATCHED", "RESOLVED", "CANCELLED"] as const;

/* ---------------- USER ---------------- */
const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ROLES, default: "CITIZEN" },
    phone: { type: String },
    district: { type: String },
    state: { type: String },
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },
    preferences: {
      notifyRadiusKm: { type: Number, default: 10 },
      alertTypes: { type: [String], default: ["LANDSLIDE", "FLOOD"] },
    },
  },
  { timestamps: true }
);
export const User = mongoose.model("User", UserSchema);

/* ---------------- LOCATION ---------------- */
const LocationSchema = new Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ["VILLAGE", "TOWN", "CITY"], default: "VILLAGE" },
    district: { type: String, required: true },
    state: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    elevationM: { type: Number },
    population: { type: Number, default: 0 },
  },
  { timestamps: true }
);
LocationSchema.index({ name: "text", district: "text", state: "text" });
export const Location = mongoose.model("Location", LocationSchema);

/* ---------------- ENVIRONMENTAL READING ---------------- */
const EnvironmentalReadingSchema = new Schema(
  {
    locationId: { type: Schema.Types.ObjectId, ref: "Location", required: true },
    rainfallMm: { type: Number, required: true },
    soilMoisturePct: { type: Number, required: true },
    slopeAngleDeg: { type: Number, required: true },
    seismicActivity: { type: Number, default: 0 },
    temperatureC: { type: Number },
    recordedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
export const EnvironmentalReading = mongoose.model("EnvironmentalReading", EnvironmentalReadingSchema);

/* ---------------- PREDICTION ---------------- */
const ForecastPointSchema = new Schema(
  {
    riskScore: { type: Number, required: true },
    severity: { type: String, enum: SEVERITY, required: true },
  },
  { _id: false }
);

const PredictionSchema = new Schema(
  {
    locationId: { type: Schema.Types.ObjectId, ref: "Location", required: true },
    riskScore: { type: Number, required: true },
    severity: { type: String, enum: SEVERITY, required: true },
    confidence: { type: Number, required: true },
    factors: [
      {
        name: { type: String },
        contributionPct: { type: Number },
      },
    ],
    current: { type: ForecastPointSchema, required: true },
    forecast6h: { type: ForecastPointSchema, required: true },
    forecast12h: { type: ForecastPointSchema, required: true },
    modelVersion: { type: String, default: "mock-v1" },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
export const Prediction = mongoose.model("Prediction", PredictionSchema);

/* ---------------- INCIDENT ---------------- */
const IncidentSchema = new Schema(
  {
    reportedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    locationId: { type: Schema.Types.ObjectId, ref: "Location", required: true },
    description: { type: String, required: true },
    gps: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    images: [
      {
        url: { type: String },
        verificationStatus: { type: String, enum: ["PENDING", "AUTHENTIC", "SUSPECTED_FAKE"], default: "PENDING" },
        verificationConfidence: { type: Number, default: 0 },
      },
    ],
    status: { type: String, enum: INCIDENT_STATUS, default: "PENDING" },
    clusterId: { type: String, default: null },
    severityGuess: { type: String, enum: SEVERITY, default: "MODERATE" },
  },
  { timestamps: true }
);
export const Incident = mongoose.model("Incident", IncidentSchema);

/* ---------------- ALERT ---------------- */
const AlertSchema = new Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    severity: { type: String, enum: SEVERITY, required: true },
    locationIds: [{ type: Schema.Types.ObjectId, ref: "Location" }],
    district: { type: String },
    state: { type: String },
    issuedBy: { type: Schema.Types.ObjectId, ref: "User" },
    active: { type: Boolean, default: true },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);
export const Alert = mongoose.model("Alert", AlertSchema);

/* ---------------- TASK FORCE ---------------- */
const TaskForceSchema = new Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: TASKFORCE_TYPE, required: true },
    status: { type: String, enum: TASKFORCE_STATUS, default: "AVAILABLE" },
    capacity: { type: Number, default: 10 },
    resources: { type: [String], default: [] },
    district: { type: String },
    state: { type: String },
    currentLocation: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    assignedIncidentId: { type: Schema.Types.ObjectId, ref: "Incident", default: null },
  },
  { timestamps: true }
);
export const TaskForce = mongoose.model("TaskForce", TaskForceSchema);

/* ---------------- ROAD ---------------- */
const RoadSchema = new Schema(
  {
    name: { type: String, required: true },
    startLocationId: { type: Schema.Types.ObjectId, ref: "Location", required: true },
    endLocationId: { type: Schema.Types.ObjectId, ref: "Location", required: true },
    status: { type: String, enum: ROAD_STATUS, default: "OPEN" },
    district: { type: String },
    state: { type: String },
  },
  { timestamps: true }
);
export const Road = mongoose.model("Road", RoadSchema);

/* ---------------- INFRASTRUCTURE ---------------- */
const InfrastructureSchema = new Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: INFRA_TYPE, required: true },
    locationId: { type: Schema.Types.ObjectId, ref: "Location", required: true },
    status: { type: String, enum: INFRA_STATUS, default: "OPERATIONAL" },
    capacity: { type: Number, default: 0 },
  },
  { timestamps: true }
);
export const Infrastructure = mongoose.model("Infrastructure", InfrastructureSchema);

/* ---------------- POPULATION ZONE ---------------- */
const PopulationZoneSchema = new Schema(
  {
    locationId: { type: Schema.Types.ObjectId, ref: "Location", required: true },
    population: { type: Number, required: true },
    vulnerablePopulation: { type: Number, default: 0 },
    householdCount: { type: Number, default: 0 },
    riskLevel: { type: String, enum: SEVERITY, default: "LOW" },
  },
  { timestamps: true }
);
export const PopulationZone = mongoose.model("PopulationZone", PopulationZoneSchema);

/* ---------------- SOS REQUEST ---------------- */
const SOSRequestSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    gps: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    description: { type: String },
    status: { type: String, enum: SOS_STATUS, default: "PENDING" },
    assignedTaskForceId: { type: Schema.Types.ObjectId, ref: "TaskForce", default: null },
    // Nearest Location, resolved server-side at creation time so admin authority
    // (district/state scoping) can be enforced the same way it is for incidents/roads.
    nearestLocationId: { type: Schema.Types.ObjectId, ref: "Location", default: null },
    district: { type: String, default: null },
    state: { type: String, default: null },
  },
  { timestamps: true }
);
export const SOSRequest = mongoose.model("SOSRequest", SOSRequestSchema);

/* ---------------- RECOMMENDATION ---------------- */
const RecommendationSchema = new Schema(
  {
    locationId: { type: Schema.Types.ObjectId, ref: "Location", default: null },
    district: { type: String },
    state: { type: String },
    type: { type: String, required: true },
    description: { type: String, required: true },
    priority: { type: String, enum: SEVERITY, default: "MODERATE" },
    targetRole: { type: String, enum: ROLES, default: "DISTRICT_ADMIN" },
  },
  { timestamps: true }
);
export const Recommendation = mongoose.model("Recommendation", RecommendationSchema);

export type UserRole = (typeof ROLES)[number];
export { Types };
