import { Config } from "./configSchema.ts";
import { config } from "dotenv";

export async function readConfigFromEnv() {
  config({ path: "/.env", quiet: true });
  return Config.parse(process.env);
}
