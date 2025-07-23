import fsp from "node:fs/promises";

import { writeConfig } from "./writeConfig.ts";
import { makeCertificate } from "../facilities/makeCertificate.ts";
import { exists } from "../facilities/exists.ts";
import { Config } from "../facilities/configSchema.ts";
import assert from "node:assert";
import ensureSSLCertificate from "../facilities/ensureSSLCertificate.ts";

async function ensureWireguardServerConfig(config: Config) {
  // Create initial server configuration
  console.log("Creating initial server configuration...");

  const serverConfig = [
    `[Interface]`,
    `PrivateKey = ${config.WIREGUARD_PRIVATE_KEY}`,
    `Address = ${config.WIREGUARD_CLIENT_IP_BASE}1/32`,
    `ListenPort = ${config.WIREGUARD_PORT}`,
    ``,
    `${config.WIREGUARD_VPN_PARAMS}`,
    ``,
  ].join("\n");

  await fsp.writeFile(config.WIREGUARD_SERVER_INTERFACE_CONFIG, serverConfig);
  await fsp.chmod(config.WIREGUARD_SERVER_INTERFACE_CONFIG, "600");
  console.log("Initial server configuration created.");
}

async function createFiles(config: Config) {
  await fsp.mkdir(config.SB_STATE_DIR, { recursive: true });
  await fsp.chmod(config.SB_STATE_DIR, 0o770);

  await fsp.mkdir(config.WIREGUARD_USER_KEYS_ROOT, {
    recursive: true,
  });
  await makeCertificate(config.HTTPS_KEY_PATH, config.HTTPS_CRT_PATH);
  await ensureWireguardServerConfig(config);
}

function printConfig(config: Config) {
  const fingerprint = ensureSSLCertificate(config);
  console.log("Wireguard Server Configuration:");
  console.log(
    JSON.stringify({
      apiUrl: `https://${config.WIREGUARD_EXTERNAL_IP}:${config.WIREGUARD_ADMIN_PORT}/${config.WIREGUARD_ADMIN_SECRET_ENDPOINT}`,
      certSha256: fingerprint,
    }),
  );
  console.log("Outline Server Configuration:");
  console.log(
    JSON.stringify({
      apiUrl: `https://${config.SB_PUBLIC_IP}:${config.SB_API_PORT}/${config.SB_API_PREFIX}`,
      certSha256: fingerprint,
    }),
  );
}

export async function main() {
  console.log("Initializing VPN server...");
  assert(
    process.getuid && process.getuid() === 0,
    "Please run the script as root.",
  );

  console.log("checking env");
  const configFilled = Config.safeParse(process.env);

  // check data/config.json
  if (configFilled.success) {
    console.log("+ Main config file exists");
    const config = configFilled.data;
    console.log(`Checking if additional files exists... `);
    console.log(`  https certificate: ${config.HTTPS_KEY_PATH}`);
    console.log(`  https certificate: ${config.HTTPS_CRT_PATH}`);
    console.log(
      `  wireguard server config: ${config.WIREGUARD_SERVER_INTERFACE_CONFIG}`,
    );
    if (
      (await exists(config.HTTPS_KEY_PATH)) &&
      (await exists(config.HTTPS_CRT_PATH)) &&
      (await exists(config.WIREGUARD_SERVER_INTERFACE_CONFIG))
    ) {
      console.log(`+ additional files exist `);
    } else {
      console.error(`! creating wg config and https certificate `);
      await createFiles(config);
    }
    printConfig(config);
  } else {
    console.error("! Main config file does not exist");
    const config = await writeConfig("/.env");
    await createFiles(config);
    printConfig(config);
  }
}

// Main execution check for ES modules
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
