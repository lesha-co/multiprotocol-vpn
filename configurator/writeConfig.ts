import assert from "node:assert";
import { createConfigObject } from "./createConfigObject.ts";
import fs from "node:fs/promises";

export async function writeConfig(
  filename: string,
  awgServerPort = process.env.AWG_PORT,
  awgAdminPort = process.env.AWG_ADMIN_PORT,
  outlineAdminPort = process.env.OUTLINE_ADMIN_PORT,
) {
  assert(awgServerPort);
  assert(outlineAdminPort);
  assert(awgAdminPort);

  const { config, envString } = await createConfigObject(
    awgServerPort,
    awgAdminPort,
    outlineAdminPort,
  );
  try {
    await fs.appendFile(filename, envString);
    console.log(`Initialized config:`);
    console.log(
      `- vpn endpoint = ${config.WIREGUARD_EXTERNAL_IP}:${config.WIREGUARD_PORT}`,
    );
    console.log(
      `- admin endpoint = ${config.WIREGUARD_EXTERNAL_IP}:${config.WIREGUARD_ADMIN_PORT}`,
    );
  } catch (error) {
    console.error("Error writing config to file:", error);
  }

  return config;
}
