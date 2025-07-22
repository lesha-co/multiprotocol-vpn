import express from "express";
import https from "node:https";
import router from "./router.ts";
import fs from "node:fs";
import getRawBody from "raw-body";
import ensureSSLCertificate from "../../facilities/ensureSSLCertificate.ts";
import { readConfigFromEnv } from "../../facilities/readConfig.ts";
const config = await readConfigFromEnv();
const fingerprint = ensureSSLCertificate(config);
const app = express();

app.use(async (req, res, next) => {
  try {
    const raw = await getRawBody(req);
    const str = raw.toString();
    req.body = JSON.parse(str);
  } catch (err) {
    req.body = {};
  }
  next();
});

app.use("/" + config.WIREGUARD_ADMIN_SECRET_ENDPOINT, router);

// Default catch-all endpoint for logging unimplemented routes
app.all("*", (req, res) => {
  console.log(
    `[${new Date().toISOString()}] Unimplemented endpoint: ${req.method} ${req.originalUrl}`,
  );
  res.status(404).json({
    code: "ENDPOINT_NOT_FOUND",
    message: `Endpoint ${req.method} ${req.originalUrl} not implemented`,
  });
});

https
  .createServer(
    {
      key: fs.readFileSync(config.HTTPS_KEY_PATH, "utf8"),
      cert: fs.readFileSync(config.HTTPS_CRT_PATH, "utf8"),
    },
    app,
  )
  .listen(config.WIREGUARD_ADMIN_PORT, () => {
    console.log(
      `WireGuard API server running on HTTPS port ${config.WIREGUARD_ADMIN_PORT}`,
    );
    // console.log(`Available endpoints:`);
    // console.log(`  GET    /health              - Health check`);
    // console.log(`  GET    /server              - Get server info`);
    // console.log(`  POST   /access-keys         - Create access key`);
    // console.log(`  GET    /access-keys         - List access keys`);
    // console.log(`  GET    /access-keys/:id     - Get specific access key`);
    // console.log(`  DELETE /access-keys/:id     - Delete access key`);
    const cfg = {
      apiUrl: `https://${config.WIREGUARD_EXTERNAL_IP}:${config.WIREGUARD_ADMIN_PORT}/${config.WIREGUARD_ADMIN_SECRET_ENDPOINT}`,
      certSha256: fingerprint,
    };
    console.log(JSON.stringify(cfg, null, 2));
  });
