import fsp from "node:fs/promises";

import { makeConfig } from "./facilities/mkConfig.ts";
import { createSSLCertificate } from "./facilities/certificate.ts";
import { checkRootPrivileges } from "./facilities/checkRootPrivileges.ts";
import { exists } from "./facilities/exists.ts";
import { Config } from "./schema.ts";
import assert from "node:assert";
import { readConfig } from "./facilities/readConfig.ts";

async function ensureWireguardServerConfig(config: Config) {
  // Create initial server configuration
  console.log("Creating initial server configuration...");

  const serverConfig = [
    `[Interface]`,
    `PrivateKey = ${config.SERVER_KEYS.PRIVATE_KEY}`,
    `Address = ${config.CLIENT_IP_BASE}1/32`,
    `ListenPort = ${config.SERVER_IP.serverPort}`,
    ``,
    `${config.VPN_PARAMS}`,
    ``,
  ].join("\n");

  await fsp.writeFile(config.SERVER_INTERFACE_CONFIG, serverConfig);
  await fsp.chmod(config.SERVER_INTERFACE_CONFIG, "600");
  console.log("Initial server configuration created.");
}

async function createFiles(config: Config) {
  await fsp.mkdir(config.USER_KEYS_ROOT, { recursive: true });
  await createSSLCertificate(config.ADMIN.HTTPS_KEY);
  await ensureWireguardServerConfig(config);
}

export async function main() {
  console.log("Initializing VPN server...");
  checkRootPrivileges();

  const configPath = process.env.CONFIG_PATH;
  assert(configPath);
  console.log(`Checking if config file exists... (${configPath})`);
  // check data/config.json
  if (await exists(configPath)) {
    console.log("+ Main config file exists");
    const config = await readConfig(configPath);
    console.log(`Checking if additional files exists... `);
    console.log(`  https certificate: ${config.ADMIN.HTTPS_KEY}`);
    console.log(`  wireguard server config: ${config.SERVER_INTERFACE_CONFIG}`);
    if (
      (await exists(config.ADMIN.HTTPS_KEY)) &&
      (await exists(config.SERVER_INTERFACE_CONFIG))
    ) {
      console.log(`+ additional files exist `);
      return;
    } else {
      console.error(`! creating wg config and https certificate `);
      await createFiles(config);
    }
  } else {
    console.error("! Main config file does not exist");
    await makeConfig();
    const config = await readConfig(configPath);
    await createFiles(config);
  }
}

// Main execution check for ES modules
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
