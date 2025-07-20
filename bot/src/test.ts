import { test, describe } from "node:test";
import { strictEqual, ok, match } from "node:assert";
import { secureFetch } from "./api/fetch.ts";
import { inventory } from "./inventory.ts";
import { Key, Outline } from "./api/outline.ts";

const servers: OutlineServer[] = inventory.servers.filter(
  (x) => x.type === "outline",
)!;
const sgp1 = servers.find((x) => x.name === "sgp1")!;

const baseUrl = sgp1.managementAPI;
const sha256fingerprint = sgp1.sha256fingerprint;

describe("SecureFetch Certificate Validation Tests", () => {
  test("should fetch server info with correct fingerprint", async () => {
    const o = new Outline(baseUrl, sha256fingerprint);
    const server = await o.getServer();
    ok(server, "Server info should be returned");
  });

  test("should reject requests with wrong certificate fingerprint", async () => {
    // Use an incorrect fingerprint (change last character)
    const wrongFingerprint = sha256fingerprint.slice(0, -1) + "X";

    try {
      await secureFetch(`${baseUrl}/server`, {
        method: "GET",
        sha256fingerprint: wrongFingerprint,
      });

      // If we reach this point, the test should fail
      ok(false, "Request should have been rejected due to wrong fingerprint");
    } catch (error) {
      // This is expected - wrong fingerprint should cause rejection
      ok(error instanceof Error, "Should throw an Error");
      match(
        (error as Error).message,
        /Certificate fingerprint mismatch/,
        "Error should mention fingerprint mismatch",
      );
    }
  });

  test("should reject requests with missing certificate fingerprint", async () => {
    try {
      await secureFetch(`${baseUrl}/server`, {
        method: "GET",
        // No sha256fingerprint provided
      });

      // If we reach this point, the test should fail
      ok(
        false,
        "Request should have been rejected due to missing fingerprint and self-signed certificate",
      );
    } catch (error) {
      // This is expected - missing fingerprint should cause rejection
      ok(error instanceof Error, "Should throw an Error");
      match(
        (error as Error).message,
        /self-signed certificate/,
        "Error should mention self-signed certificate",
      );
    }
  });

  test("should validate fingerprint on consecutive requests", async () => {
    // First request with correct fingerprint
    const firstResponse = await secureFetch(`${baseUrl}/server`, {
      method: "GET",
      sha256fingerprint,
    });

    ok(
      firstResponse.ok,
      "First request with correct fingerprint should succeed",
    );

    // Second request with wrong fingerprint should still fail
    const wrongFingerprint = sha256fingerprint.slice(0, -1) + "X";

    try {
      await secureFetch(`${baseUrl}/server`, {
        method: "GET",
        sha256fingerprint: wrongFingerprint,
      });

      // If we reach this point, the test should fail
      ok(
        false,
        "Second request should have been rejected despite previous successful connection",
      );
    } catch (error) {
      // This is expected - wrong fingerprint should cause rejection even after successful connection
      ok(error instanceof Error, "Should throw an Error");
      match(
        (error as Error).message,
        /Certificate fingerprint mismatch/,
        "Error should mention fingerprint mismatch",
      );
    }
  });
});

describe("Outline API Key Management Tests", () => {
  let testKey: Key;

  test("should create access key", async () => {
    const o = new Outline(baseUrl, sha256fingerprint);
    testKey = await o.createKey("secure-fetch-test-key");
    strictEqual(testKey.name, "secure-fetch-test-key");
    ok(testKey.id, "Created key should have an ID");
  });

  test("should modify access key", async () => {
    ok(testKey, "Test key should exist from previous test");

    const o = new Outline(baseUrl, sha256fingerprint);
    const updatedKey = await o.renameKey(
      testKey.id,
      "updated-secure-fetch-key",
    );
    strictEqual(updatedKey.name, "updated-secure-fetch-key");
    strictEqual(updatedKey.id, testKey.id);
  });

  test("should delete access key", async () => {
    ok(testKey, "Test key should exist from previous test");

    const o = new Outline(baseUrl, sha256fingerprint);
    await o.deleteKey(testKey.id);

    const deletedKey = await o.getKey(testKey.id);
    strictEqual(deletedKey, undefined, "Key should not exist after deletion");
  });
});

describe("SecureFetch HTTP Methods Tests", () => {
  let createdKeys: string[] = [];

  test("should handle GET requests", async () => {
    const response = await secureFetch(`${baseUrl}/server`, {
      method: "GET",
      sha256fingerprint,
    });

    ok(response.ok, "GET request should succeed");
    strictEqual(response.status, 200, "Status should be 200");

    const data = await response.json();
    ok(data, "Response should contain data");
  });

  test("should handle POST requests", async () => {
    const keyData = {
      name: "post-test-key",
      limit: { bytes: 1000000000 },
    };

    const response = await secureFetch(`${baseUrl}/access-keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(keyData),
      sha256fingerprint,
    });

    ok(response.ok, "POST request should succeed");
    strictEqual(
      response.status,
      201,
      "Status should be 201 for created resource",
    );

    const createdKey = await response.json();
    ok(createdKey.id, "Created key should have an ID");
    strictEqual(createdKey.name, keyData.name, "Key name should match");

    createdKeys.push(createdKey.id);
  });

  test("should handle DELETE requests", async () => {
    // Create a key to delete
    const keyData = {
      name: "delete-test-key",
      limit: { bytes: 500000000 },
    };

    const createResponse = await secureFetch(`${baseUrl}/access-keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(keyData),
      sha256fingerprint,
    });

    ok(createResponse.ok, "Key creation should succeed");
    const keyToDelete = await createResponse.json();

    // Now delete it
    const deleteResponse = await secureFetch(
      `${baseUrl}/access-keys/${keyToDelete.id}`,
      {
        method: "DELETE",
        sha256fingerprint,
      },
    );

    ok(
      [200, 204].includes(deleteResponse.status),
      "DELETE should return 200 or 204",
    );
  });

  test("should handle custom headers", async () => {
    const response = await secureFetch(`${baseUrl}/server`, {
      method: "GET",
      sha256fingerprint,
      headers: {
        "User-Agent": "VPN-Manager-Bot-SecureFetch/1.0",
        "X-Custom-Header": "test-value",
        Accept: "application/json",
      },
    });

    ok(response.ok, "Request with custom headers should succeed");
    strictEqual(response.status, 200, "Status should be 200");
  });

  test("should handle non-existent endpoints", async () => {
    const response = await secureFetch(`${baseUrl}/nonexistent-endpoint`, {
      method: "GET",
      sha256fingerprint,
    });

    strictEqual(response.ok, false, "Non-existent endpoint should not be ok");
    strictEqual(
      response.status,
      404,
      "Should return 404 for non-existent endpoint",
    );
  });

  // Cleanup any remaining test keys
  test("cleanup test keys", async () => {
    for (const keyId of createdKeys) {
      try {
        await secureFetch(`${baseUrl}/access-keys/${keyId}`, {
          method: "DELETE",
          sha256fingerprint,
        });
      } catch (error) {
        console.log(
          `⚠️ Failed to cleanup key ${keyId}:`,
          (error as Error).message,
        );
      }
    }
  });
});
