import assert from "node:assert";
import crypto from "node:crypto";
import { Key, ListKeysResponse, OutlineServer } from "../../schemas/types.ts";
import { secureFetch } from "./fetch.ts";
export function randomString() {
  return crypto.randomBytes(2).toString("hex");
}

export class Outline {
  public mgmt: string;
  public sha256fingerprint: string;

  constructor(mgmt: string, sha256fingerprint: string) {
    this.mgmt = mgmt;
    this.sha256fingerprint = sha256fingerprint;
  }

  async fetch(url: string, init?: RequestInit) {
    return secureFetch(url, {
      ...init,
      sha256fingerprint: this.sha256fingerprint,
    });
  }

  async getServer(): Promise<OutlineServer> {
    const response = await this.fetch(`${this.mgmt}/server`);
    const json = await response.json();
    const parsed = OutlineServer.parse(json);
    return parsed;
  }
  async listKeys(): Promise<Key[]> {
    const response = await this.fetch(`${this.mgmt}/access-keys`);
    const json = await response.json();
    const parsed = ListKeysResponse.safeParse(json);
    if (parsed.success) {
      return parsed.data.accessKeys;
    } else {
      console.log("-- OOPS ------------------------------");
      console.log(JSON.stringify(json, null, 2));
      console.log("-- OOPS ------------------------------");
      throw parsed.error;
    }
  }
  async getKey(id: string): Promise<Key | undefined> {
    const response = await this.fetch(`${this.mgmt}/access-keys/${id}`);
    if (response.status === 404) {
      return undefined;
    }
    const json = await response.json();
    const parsed = Key.parse(json);
    return parsed;
  }
  async createKey(name: string): Promise<Key> {
    const server = await this.getServer();

    const response = await this.fetch(`${this.mgmt}/access-keys`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        password: randomString(),
        port: server.portForNewAccessKeys,
        method: "chacha20-ietf-poly1305",
      }),
    });
    assert(response.status === 201);
    const json = await response.json();
    const parsed = Key.parse(json);
    return parsed;
  }
  async renameKey(id: string, newName: string): Promise<Key> {
    const response = await this.fetch(`${this.mgmt}/access-keys/${id}/name`, {
      headers: {
        "Content-Type": "application/json",
      },
      method: "PUT",
      body: JSON.stringify({
        name: newName,
      }),
    });
    assert(response.status === 204);
    const newKey = await this.getKey(id);
    assert(newKey?.name === newName);
    return newKey;
  }
  async deleteKey(id: string): Promise<void> {
    const response = await this.fetch(`${this.mgmt}/access-keys/${id}`, {
      method: "DELETE",
    });
    assert(response.status === 204);
  }
}
