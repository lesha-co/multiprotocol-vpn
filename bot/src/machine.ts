import type TelegramBot from "node-telegram-bot-api";
import type { StateMachine } from "./lib/stateMachineRunner.ts";
import { createMessage } from "./lib/telegram/createMessage.ts";
import { getAllKeys, userToString } from "./lib/getAllKeys.ts";
import { readInventory } from "./inventory.ts";
import { Outline, randomString } from "./lib/backends/outline.ts";

type SendOptions = {
  text: string;
  options?: TelegramBot.SendMessageOptions;
};

type SendOptionsKeyboard = {
  text: string;
  options: TelegramBot.SendMessageOptions & {
    reply_markup: TelegramBot.ReplyKeyboardMarkup;
  };
};

export type TelegramDialogContext = {
  user: TelegramBot.User;
  get: () => Promise<string>;
  send: (msg: SendOptions) => Promise<void>;
  input: <T extends SendOptionsKeyboard>(
    msg: T,
  ) => Promise<
    T["options"]["reply_markup"]["keyboard"][number][number]["text"]
  >;
};

export const stateMachine: StateMachine<
  | { id: "root"; transitions: "start" }
  | { id: "start"; transitions: "my_keys" | "new_key" }
  | { id: "my_keys"; transitions: "start" | "delete_key" }
  | { id: "delete_key"; transitions: "start" }
  | { id: "new_key"; transitions: "amnezia" | "outline" | "start" }
  | { id: "amnezia"; transitions: "start" }
  | { id: "outline"; transitions: "start" },
  TelegramDialogContext
> = {
  states: {
    async root({ send }) {
      await send({ text: "Hello!" });
      return { id: "start" };
    },
    async start({ input }) {
      const response = await input({
        text: "Выбери действие",
        options: {
          reply_markup: {
            keyboard: [[{ text: "Хочу новый ключ" }, { text: "Мои ключи" }]],
          },
        },
      } as const);

      if (response === "Хочу новый ключ") {
        return { id: "new_key" };
      } else {
        response satisfies "Мои ключи";
        return { id: "my_keys" };
      }
    },
    async my_keys({ send, user, input }) {
      const keys = await getAllKeys(user);

      if (keys.length === 0) {
        send({ text: "У тебя ещё нет ключей" });
        return { id: "start" };
      }
      const keyList = keys.map(
        (x) =>
          `${x.key.name}\n${x.server.name} (${x.server.type}) \n \`\`\`${x.key.accessUrl}\`\`\``,
      );

      const response = await input({
        text: `Вот твои ключи:\n${keyList.join("\n\n")}`,
        options: {
          parse_mode: "Markdown",
          reply_markup: {
            keyboard: [
              [{ text: "🏠 Главное меню" }, { text: "🗑️ Удалить ключ" }],
            ],
            resize_keyboard: true,
          },
        },
      } as const);

      if (response === "🏠 Главное меню") {
        return { id: "start" };
      }

      return { id: "delete_key" };
    },
    async delete_key({ send, input, user }) {
      const allKeys = await getAllKeys(user);
      if (allKeys.length === 0) {
        await send({ text: "У тебя ещё нет ключей" });
        return { id: "start" };
      }

      const response = await input({
        text: `Какой ключ?`,
        options: {
          reply_markup: {
            keyboard: [
              [{ text: "🏠 Главное меню" }],
              ...allKeys.map((key) => [
                { text: `${key.server.name}:${key.key.id}:${key.key.name}` },
              ]),
            ],
          },
        },
      } as const);

      if (response === "🏠 Главное меню") {
        return { id: "start" };
      }

      const [serverName, id] = response.split(":");
      const inventory = await readInventory();
      const server = inventory.find((x) => x.name === serverName);
      if (!server) {
        await send({ text: "Сервер не найден" });
        return { id: "start" };
      }
      if (server.type === "amnezia") {
        await send({ text: "Amnezia не поддерживается" });
        return { id: "start" };
      }
      const outline = new Outline(
        server.managementAPI,
        server.sha256fingerprint,
      );
      await outline.deleteKey(id);
      await send({ text: "Операция выполнена" });
      return { id: "start" };
    },
    async new_key({ input }) {
      const response = await input({
        text: `Какой протокол?`,
        options: {
          reply_markup: {
            keyboard: [
              [{ text: "Amnezia" }, { text: "Outline" }],
              [{ text: "Отмена" }],
            ],
            resize_keyboard: true,
          },
        },
      } as const);

      switch (response) {
        case "Amnezia":
          return { id: "amnezia" };
        case "Outline":
          return { id: "outline" };
        default:
          return { id: "start" };
      }
    },
    async amnezia({ send }) {
      await send({ text: "Не поддерживается" });
      return { id: "start" };
    },
    async outline({ send, input, user }) {
      const inventory = await readInventory();
      const outlineServers = inventory.filter((x) => x.type === "outline");
      const servers = outlineServers.map((x) => [{ text: x.name }]);

      const selectedServer = await input({
        text: `Какой сервер?`,
        options: {
          reply_markup: {
            keyboard: servers,
          },
        },
      } as const);

      const server = outlineServers.find((x) => x.name === selectedServer);
      if (!server) {
        await send({ text: "Сервер не найден" });
        return { id: "start" };
      }

      const outlineClient = new Outline(
        server.managementAPI,
        server.sha256fingerprint,
      );
      const key = await outlineClient.createKey(
        `${userToString(user)}#${randomString()}`,
      );

      const keytext = "```" + key.accessUrl + "```";

      await send(
        createMessage(`Выбран сервер ${server?.name}\n${keytext}`, {
          md: true,
          removeKeyboard: true,
        }),
      );

      return { id: "start" };
    },
  },
  rootState: { id: "root" },
};
