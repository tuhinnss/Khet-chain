import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { env } from "./env.js";

let memoryServer: MongoMemoryServer | null = null;

export async function connectDB(): Promise<void> {
  let uri = env.MONGODB_URI;

  if (env.USE_MEMORY_DB) {
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri("khetchain");
    console.log("Using in-memory MongoDB (dev mode)");
  }

  await mongoose.connect(uri);
  console.log("MongoDB connected");
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}
