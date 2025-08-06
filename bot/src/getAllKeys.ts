import { readInventory } from "./inventory.ts";
import { Outline } from "./outline.ts";
import TelegramBot from "node-telegram-bot-api";

export function userToString(user: TelegramBot.User) {
  return `${user.id}~${user.username ?? "<unnamed>"}`;
}
function getKeyBelongsToUser(keyName: string, user: TelegramBot.User) {
  return keyName.split("~")[0] === user.id.toString();
}

export async function getAllKeys(user: TelegramBot.User) {
  const inventory = await readInventory();

  const outlineAPIs = inventory.map((server) => ({
    server,
    api: new Outline(server.managementAPI, server.sha256fingerprint),
  }));

  const keys = await Promise.all(
    outlineAPIs.map(async ({ api, server }) => {
      const keys = await api.listKeys();
      return { server, keys };
    }),
  );

  const keysComplete = keys.flatMap(({ server, keys }) => {
    return keys.map((key) => ({
      key,
      server,
    }));
  });

  return keysComplete.filter((key) => getKeyBelongsToUser(key.key.name, user));
}
