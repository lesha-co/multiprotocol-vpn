import fs from "node:fs/promises";
import type { Config } from "../../facilities/configSchema.ts";
import { ServerInventory } from "../../schemas/types.ts";
import z from "zod";
import { readConfigFromEnv } from "../../facilities/readConfig.ts";

export async function readInventory(): Promise<ServerInventory[]> {
  const config = await readConfigFromEnv();
  const inv = await fs.readFile(config.INVENTORY_FILE, "utf-8");
  const inventory = z.array(ServerInventory).parse(JSON.parse(inv));
  return inventory;
}
