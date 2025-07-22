import { execSync } from "node:child_process";
import type { Config } from "./configSchema";

// SSL Certificate check and creation
export default function ensureSSLCertificate(config: Config) {
  const fingerprintCmd = `openssl x509 -noout -fingerprint -sha256 -in <(openssl x509 -in ${config.HTTPS_CRT_PATH})`;

  const fingerprint = execSync(`bash -c "${fingerprintCmd}"`, {
    encoding: "utf8",
  })
    .trim()
    .split("=")[1]
    .replaceAll(":", "");

  return fingerprint;
}
