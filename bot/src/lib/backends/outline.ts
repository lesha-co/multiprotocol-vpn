import assert from "node:assert";
import crypto from "node:crypto";
import { secureFetch } from "../../api/fetch.ts";
import { ListKeysResponse, Key, Server } from "schemas";
export function randomString() {
  return crypto.randomBytes(24).toString("base64");
}

export class Outline {
  public mgmt: string;
  public sha256fingerprint: string;
  public method: string;

  constructor(mgmt: string, sha256fingerprint: string, method?: string) {
    const m = method ?? process.env.OUTLINE_NEW_KEY_METHOD;
    assert(m);
    this.method = m;
    this.mgmt = mgmt;
    this.sha256fingerprint = sha256fingerprint;
  }

  async fetch(url: string, init?: RequestInit) {
    return secureFetch(url, {
      ...init,
      sha256fingerprint: this.sha256fingerprint,
    });
  }

  async getServer(): Promise<Server> {
    const response = await this.fetch(`${this.mgmt}/server`);
    const json = await response.json();
    const parsed = Server.parse(json);
    return parsed;
  }
  async listKeys(): Promise<Key[]> {
    const response = await this.fetch(`${this.mgmt}/access-keys`);
    const json = await response.json();
    const parsed = ListKeysResponse.parse(json);
    return parsed.accessKeys;
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
        method: this.method,
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
