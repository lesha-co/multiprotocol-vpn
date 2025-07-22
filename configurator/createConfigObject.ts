import { getIP } from "./getIP.ts";
import crypto from "node:crypto";
import type { Config } from "../facilities/configSchema.ts";

import { generateKeyPair } from "@stablelib/x25519";

function randint(from: number, to: number) {
  return Math.floor(Math.random() * (to - from + 1)) + from;
}

function randomString() {
  const randomBytes = crypto.getRandomValues(new Uint8Array(64));
  return Buffer.from(randomBytes).toString("base64url");
}

function generate25519() {
  const keyPair = generateKeyPair();
  return {
    publicKey: Buffer.from(keyPair.publicKey).toString("base64"),
    privateKey: Buffer.from(keyPair.secretKey).toString("base64"),
  };
}

function generateVPNParams() {
  const headerBase = () => randint(0, 0x4000_0000); // max 32 bit integer / 4
  return [
    `Jc = ${randint(5, 15)}`,
    `Jmin = ${randint(25, 75)}`,
    `Jmax = ${randint(500, 1000)}`,
    `S1 = ${randint(50, 100)}`,
    `S2 = ${randint(125, 175)}`,
    // the headers will not collide
    `H1 = ${headerBase() + 0}`,
    `H2 = ${headerBase() + 1}`,
    `H3 = ${headerBase() + 2}`,
    `H4 = ${headerBase() + 3}`,
  ].join("\n");
}

export async function createConfigObject(
  awgServerPort: string,
  awgAdminPort: string,
  outlineAdminPort: string,
) {
  const serverKeys = generate25519();

  const config: Config = {
    WIREGUARD_EXTERNAL_IP: await getIP(),
    WIREGUARD_PORT: awgServerPort,
    WIREGUARD_DNS: "8.8.8.8, 8.8.4.4",
    WIREGUARD_VPN_PARAMS: generateVPNParams(),
    WIREGUARD_SERVER_INTERFACE_CONFIG: "/data/awg0.conf",
    WIREGUARD_USER_KEYS_ROOT: "/data/user-keys",
    WIREGUARD_CLIENT_IP_BASE: "192.168.200.",
    WIREGUARD_PUBLIC_KEY: serverKeys.publicKey,
    WIREGUARD_PRIVATE_KEY: serverKeys.privateKey,
    WIREGUARD_ADMIN_PORT: awgAdminPort,
    WIREGUARD_ADMIN_SECRET_ENDPOINT: randomString(),

    HTTPS_KEY_PATH: "/data/cert.key",
    HTTPS_CRT_PATH: "/data/cert.crt",

    SB_STATE_DIR: "/data/outline-persisted-state",
    SB_API_PORT: outlineAdminPort,
    SB_API_PREFIX: randomString(),
    SB_CERTIFICATE_FILE: "/data/cert.key",
    SB_PRIVATE_KEY_FILE: "/data/cert.crt",
  };

  const envString = Object.entries(config)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}="${value.replaceAll("\n", "\\n")}"`)
    .join("\n");

  return { config, envString };
}
