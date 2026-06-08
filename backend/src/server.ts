import app from "./app.js";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";
import { startEventListener } from "./services/eventListener.service.js";

async function bootstrap() {
  await connectDB();
  await startEventListener();
  app.listen(env.PORT, () => {
    console.log(`KhetChain API running on http://localhost:${env.PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
