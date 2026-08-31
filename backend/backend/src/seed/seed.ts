import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDB } from "../config/db";
import {
  User,
  Location,
  EnvironmentalReading,
  Prediction,
  Incident,
  Alert,
  TaskForce,
  Road,
  Infrastructure,
  PopulationZone,
  SOSRequest,
  Recommendation,
} from "../models/models";
import { generateMockRisk } from "../utils/riskEngine";
import mongoose from "mongoose";

const LOCATIONS = [
  { name: "Gangtok", district: "East Sikkim", state: "Sikkim", lat: 27.3389, lng: 88.6065, population: 100286, type: "TOWN" },
  { name: "Mangan", district: "North Sikkim", state: "Sikkim", lat: 27.5167, lng: 88.5333, population: 5942, type: "VILLAGE" },
  { name: "Shillong", district: "East Khasi Hills", state: "Meghalaya", lat: 25.5788, lng: 91.8933, population: 143229, type: "CITY" },
  { name: "Sohra", district: "East Khasi Hills", state: "Meghalaya", lat: 25.2841, lng: 91.7273, population: 12363, type: "TOWN" },
  { name: "Aizawl", district: "Aizawl", state: "Mizoram", lat: 23.7271, lng: 92.7176, population: 293416, type: "CITY" },
  { name: "Champhai", district: "Champhai", state: "Mizoram", lat: 23.4667, lng: 93.3333, population: 24589, type: "TOWN" },
  { name: "Kohima", district: "Kohima", state: "Nagaland", lat: 25.6751, lng: 94.1086, population: 99039, type: "CITY" },
  { name: "Mokokchung", district: "Mokokchung", state: "Nagaland", lat: 26.3231, lng: 94.5153, population: 35913, type: "TOWN" },
  { name: "Itanagar", district: "Papum Pare", state: "Arunachal Pradesh", lat: 27.0844, lng: 93.6053, population: 59490, type: "CITY" },
  { name: "Bomdila", district: "West Kameng", state: "Arunachal Pradesh", lat: 27.2645, lng: 92.4159, population: 8422, type: "TOWN" },
  { name: "Agartala", district: "West Tripura", state: "Tripura", lat: 23.8315, lng: 91.2868, population: 400004, type: "CITY" },
  { name: "Guwahati", district: "Kamrup Metropolitan", state: "Assam", lat: 26.1445, lng: 91.7362, population: 963429, type: "CITY" },
  { name: "Haflong", district: "Dima Hasao", state: "Assam", lat: 25.1667, lng: 93.0167, population: 40012, type: "TOWN" },
];

const rand = (min: number, max: number) => Math.round(min + Math.random() * (max - min));
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

async function seed() {
  await connectDB();
  console.log("[seed] clearing existing data...");
  await Promise.all([
    User.deleteMany({}),
    Location.deleteMany({}),
    EnvironmentalReading.deleteMany({}),
    Prediction.deleteMany({}),
    Incident.deleteMany({}),
    Alert.deleteMany({}),
    TaskForce.deleteMany({}),
    Road.deleteMany({}),
    Infrastructure.deleteMany({}),
    PopulationZone.deleteMany({}),
    SOSRequest.deleteMany({}),
    Recommendation.deleteMany({}),
  ]);

  console.log("[seed] creating users...");
  const passwordHash = await bcrypt.hash("password123", 10);
  const users = await User.insertMany([
    { name: "Citizen Demo", email: "citizen@demo.in", password: passwordHash, role: "CITIZEN", district: "East Khasi Hills", state: "Meghalaya" },
    { name: "District Admin Demo", email: "district@demo.in", password: passwordHash, role: "DISTRICT_ADMIN", district: "East Khasi Hills", state: "Meghalaya" },
    { name: "State Admin Demo", email: "state@demo.in", password: passwordHash, role: "STATE_ADMIN", state: "Meghalaya" },
    { name: "Central Admin Demo", email: "central@demo.in", password: passwordHash, role: "CENTRAL_ADMIN" },
  ]);

  console.log("[seed] creating locations...");
  const locations = await Location.insertMany(LOCATIONS);

  console.log("[seed] creating environmental readings + predictions...");
  for (const loc of locations) {
    const rainfallMm = rand(20, 220);
    const soilMoisturePct = rand(30, 95);
    const slopeAngleDeg = rand(10, 55);

    await EnvironmentalReading.create({ locationId: loc._id, rainfallMm, soilMoisturePct, slopeAngleDeg, seismicActivity: rand(0, 5) / 10, temperatureC: rand(12, 30) });

    const risk = generateMockRisk(loc._id.toString(), rainfallMm, soilMoisturePct, slopeAngleDeg);
    await Prediction.create({ locationId: loc._id, ...risk });

    await PopulationZone.create({
      locationId: loc._id,
      population: loc.population,
      vulnerablePopulation: Math.round(loc.population * 0.12),
      householdCount: Math.round(loc.population / 5),
      riskLevel: risk.severity,
    });
  }

  console.log("[seed] creating roads...");
  for (let i = 0; i < locations.length - 1; i++) {
    await Road.create({
      name: `${locations[i].name} - ${locations[i + 1].name} Highway`,
      startLocationId: locations[i]._id,
      endLocationId: locations[i + 1]._id,
      status: pick(["OPEN", "OPEN", "OPEN", "BLOCKED", "DAMAGED"]),
      district: locations[i].district,
      state: locations[i].state,
    });
  }

  console.log("[seed] creating infrastructure...");
  const infraTypes = ["HOSPITAL", "SCHOOL", "BRIDGE", "POWER", "SHELTER"];
  for (const loc of locations) {
    for (const type of infraTypes) {
      await Infrastructure.create({
        name: `${loc.name} ${type.charAt(0)}${type.slice(1).toLowerCase()}`,
        type,
        locationId: loc._id,
        status: pick(["OPERATIONAL", "OPERATIONAL", "OPERATIONAL", "DAMAGED"]),
        capacity: rand(20, 500),
      });
    }
  }

  console.log("[seed] creating task forces...");
  const tfTypes = ["NDRF", "SDRF", "MEDICAL", "ENGINEERING", "POLICE"];
  for (const loc of locations) {
    await TaskForce.create({
      name: `${loc.name} Rapid Response Unit`,
      type: pick(tfTypes),
      status: pick(["AVAILABLE", "AVAILABLE", "DEPLOYED"]),
      capacity: rand(10, 40),
      resources: ["medical kits", "ropes", "excavation tools"],
      district: loc.district,
      state: loc.state,
      currentLocation: { lat: loc.lat + (Math.random() - 0.5) * 0.05, lng: loc.lng + (Math.random() - 0.5) * 0.05 },
    });
  }

  console.log("[seed] creating incidents...");
  const citizen = users[0];
  for (let i = 0; i < 6; i++) {
    const loc = pick(locations);
    await Incident.create({
      reportedBy: citizen._id,
      locationId: loc._id,
      description: pick([
        "Cracks appearing on hillside near the main road",
        "Small landslide blocked footpath after heavy rain",
        "Water seepage observed on slope above houses",
        "Trees tilting on the hill slope",
      ]),
      gps: { lat: loc.lat + (Math.random() - 0.5) * 0.01, lng: loc.lng + (Math.random() - 0.5) * 0.01 },
      images: [{ url: "https://example.com/mock-incident.jpg", verificationStatus: pick(["AUTHENTIC", "SUSPECTED_FAKE"]), verificationConfidence: rand(60, 98) }],
      status: pick(["PENDING", "VERIFIED", "RESOLVED"]),
      clusterId: `CLUSTER-${loc._id}-seed`,
    });
  }

  console.log("[seed] creating alerts...");
  for (const loc of locations.slice(0, 5)) {
    await Alert.create({
      title: `Landslide Risk Alert - ${loc.name}`,
      message: `Elevated landslide risk detected in ${loc.name}, ${loc.district}. Residents advised to stay alert and avoid slope areas.`,
      severity: pick(["MODERATE", "HIGH", "CRITICAL"]),
      locationIds: [loc._id],
      district: loc.district,
      state: loc.state,
      issuedBy: users[1]._id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
  }

  console.log("[seed] creating SOS requests...");
  const taskForces = await TaskForce.find();
  for (let i = 0; i < 3; i++) {
    const loc = pick(locations);
    await SOSRequest.create({
      userId: citizen._id,
      gps: { lat: loc.lat, lng: loc.lng },
      description: "Trapped near collapsed section of road, need immediate assistance",
      status: pick(["PENDING", "ACKNOWLEDGED"]),
      assignedTaskForceId: pick(taskForces)._id,
    });
  }

  console.log("[seed] creating recommendations...");
  for (const loc of locations.slice(0, 6)) {
    await Recommendation.create({
      locationId: loc._id,
      district: loc.district,
      state: loc.state,
      type: pick(["EVACUATION", "MONITORING", "ROAD_CLOSURE", "RESOURCE_DEPLOYMENT"]),
      description: `Increase monitoring frequency and pre-position task force resources near ${loc.name} due to elevated risk levels.`,
      priority: pick(["MODERATE", "HIGH", "CRITICAL"]),
      targetRole: pick(["DISTRICT_ADMIN", "STATE_ADMIN"]),
    });
  }

  console.log("[seed] done.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("[seed] failed", err);
  process.exit(1);
});
