import fs from "node:fs/promises";
import { Config } from "../../facilities/configSchema";
import { ServerInventory } from "../../schemas/types";
import z from "zod";
import { readConfigFromEnv } from "../../facilities/readConfig";

export async function readInventory(): Promise<ServerInventory[]> {
  const config = await readConfigFromEnv();
  const inv = await fs.readFile(config.INVENTORY_FILE, "utf-8");
  const inventory = z.array(ServerInventory).parse(JSON.parse(inv));
  return inventory;
}
