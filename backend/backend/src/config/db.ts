import mongoose from "mongoose";

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/sih_landslide";
  await mongoose.connect(uri);
  console.log("[db] connected:", uri);
}
