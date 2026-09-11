import { z } from "zod";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Resolve .env paths relative to this file's location, not the process's
// current working directory (which differs depending on where `npm run dev`
// is invoked from). Load backend/.env first, then fall back to the shared
// root .env for any variable backend/.env doesn't define.
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../../.env") });
dotenv.config({ path: join(__dirname, "../../../.env") });

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
