import https from "node:https";
import http from "node:http";
import tls from "node:tls";
import crypto from "node:crypto";
import { URL } from "node:url";
import { TLSSocket } from "node:tls";

type RequestInit2 = RequestInit & { sha256fingerprint: string };

function conformHeaders(
  headers: HeadersInit | undefined,
): Record<string, http.OutgoingHttpHeader> {
  if (headers === undefined) return {};

  if (Array.isArray(headers)) {
    const _headers: Record<string, string> = {};
    headers.forEach(([k, v]) => {
      _headers[k] = v;
    });
    return _headers;
  }

  if (headers instanceof Headers) {
    const _headers: Record<string, string> = {};
    headers.forEach((value, key) => {
      _headers[key] = value;
    });
    return _headers;
  }
  return headers;
}

function validateCertificate(
  socket: tls.TLSSocket,
  requiredFingerprint: string,
) {
  const cert = socket.getPeerCertificate(true);
  if (cert && cert.raw) {
    // Always calculate and validate the fingerprint for security
    const fingerprint = crypto
      .createHash("sha256")
      .update(cert.raw)
      .digest("hex")
      .toUpperCase();

    if (fingerprint !== requiredFingerprint) {
      const error = new Error(
        `Certificate fingerprint mismatch. Expected: ${requiredFingerprint}, Got: ${fingerprint}`,
      );

      return error;
    }

    return true;
  } else {
    const error = new Error("No certificate available for validation");
    console.error("❌ No certificate found:", error.message);

    return error;
  }
}
/**
 * Makes an HTTPS request with certificate validation
 */
function makeSecureRequest(
  url: string,
  options: RequestInit2,
): Promise<Response> {
  const { sha256fingerprint } = options;

  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);

    const headers = conformHeaders(options.headers);

    // Add body if present
    if (options.body) {
      if (typeof options.body === "string") {
        headers["Content-Length"] = Buffer.byteLength(options.body);
      } else if (Buffer.isBuffer(options.body)) {
        headers["Content-Length"] = options.body.length;
      }
    }

    const requestOptions: https.RequestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || "GET",
      headers: headers,
      rejectUnauthorized: sha256fingerprint === undefined, // Allow self-signed certificates
      checkServerIdentity: (hostname, cert) => {
        console.log(hostname, cert);
        return undefined;
      }, // We'll do our own validation
      // Force new connection to ensure certificate validation on every request
      agent: false,
    };

    const req = https.request(requestOptions, (res) => {
      let data = Buffer.alloc(0);

      res.on("data", (chunk) => {
        data = Buffer.concat([data, chunk]);
      });

      res.on("end", () => {
        if (res.statusCode === undefined) {
          reject(new Error("No status code received"));
          return;
        }
        const headerPairs = Object.entries(res.headersDistinct);
        const responseHeaders = new Headers();
        for (const [key, value] of headerPairs) {
          if (value) {
            value.forEach((v) => responseHeaders.append(key, v));
          }
        }

        // body must be null if status code is 204 No Content
        const body = res.statusCode === 204 ? null : data;
        const response = new Response(body, {
          status: res.statusCode,
          statusText: res.statusMessage || "",
          headers: responseHeaders,
        });
        // Create fetch-like response object

        resolve(response);
      });
    });

    req.on("error", (error) => {
      console.error(`❌ Request failed:`, error.message);
      reject(error);
    });

    req.on("socket", (socket) => {
      // Validate certificate fingerprint on every connection

      socket.on("secureConnect", () => {
        const result = validateCertificate(
          socket as TLSSocket,
          options.sha256fingerprint,
        );
        if (result !== true) {
          socket.destroy();
          reject(result);
        }
      });
    });

    // Write body if present
    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

/**
 * Secure fetch function that validates certificate fingerprint
 * Provides a fetch-like API using the reliable HTTPS approach
 */
export async function secureFetch(
  url: string,
  options: RequestInit2,
): Promise<Response> {
  // const requestId = id();
  // console.log(`[${requestId}] 🚀  ${options.method || "GET"} ${url}`);
  if (!(typeof options.body === "string")) {
    options.body = JSON.stringify(options.body);
  }

  try {
    const response = await makeSecureRequest(url, options);
    // console.log(`[${requestId}] ✅ ${response.status}`);
    return response;
  } catch (error) {
    // console.error(`[${requestId}]💥 Request failed:`, (error as Error).message);
    throw error;
  }
}
