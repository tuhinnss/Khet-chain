import { z } from "zod";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().default("mongodb://localhost:27017/khetchain"),
  USE_MEMORY_DB: z.coerce.boolean().default(false),
  JWT_SECRET: z.string().min(8).default("khetchain-dev-secret-change-me"),
  RPC_URL: z.string().default("http://127.0.0.1:8545"),
  CHAIN_ID: z.coerce.number().default(31337),
  KHETCHAIN_CONTRACT_ADDRESS: z.string().optional(),
  RELAYER_PRIVATE_KEY: z.string().optional(),
  FRONTEND_URL: z.string().default("http://localhost:5173"),
});

export const env = envSchema.parse(process.env);
