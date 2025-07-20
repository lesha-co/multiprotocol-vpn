import assert from "node:assert";
import { Config } from "../schema";
import fsp from "node:fs/promises";

export async function readConfig(configPath: string) {
  const j = JSON.parse(await fsp.readFile(configPath, "utf8"));
  return Config.parse(j);
}

export async function readConfigFromDefaultLocation() {
  const configPath = process.env.CONFIG_PATH;
  assert(configPath, "CONFIG_PATH environment variable is not set");
  return await readConfig(configPath);
}
