import path from "node:path";
import { execSync } from "node:child_process";

export async function makeCertificate(keyPath: string, crtPath: string) {
  console.log("Creating a self-signed SSL certificate");

  // Generate self-signed certificate and key in a single .pem file
  const tempKey = path.join(keyPath);
  const tempCert = path.join(crtPath);

  // Create key and certificate
  const opensslCmd = `openssl req -x509 -newkey rsa:4096 -keyout ${tempKey} -out ${tempCert} -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/OU=OrgUnit/CN=localhost"`;
  execSync(opensslCmd);

  console.log("Certificate created successfully");
}
