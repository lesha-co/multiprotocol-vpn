import type TelegramBot from "node-telegram-bot-api";
import type { StateMachine } from "@leshenka/state-machine-runner";
import type { ServerInventory } from "../../schemas/types.ts";
import { createMessage } from "@leshenka/telegram-bot-framework";
import { getAllKeys, userToString } from "./getAllKeys.ts";
import { readInventory } from "./inventory.ts";
import { Outline, randomString } from "./outline.ts";

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
  | { id: "root"; transitions: "my_keys" | "new_key" | "guide" }
  | { id: "my_keys"; transitions: "root" | "delete_key" }
  | { id: "delete_key"; transitions: "root" }
  | { id: "new_key"; transitions: "root" }
  | { id: "guide"; transitions: "root" },
  TelegramDialogContext
> = {
  states: {
    async root({ input }) {
      const response = await input({
        text: "Выбери действие",
        options: {
          reply_markup: {
            keyboard: [
              [{ text: "Хочу новый ключ" }],
              [{ text: "Мои ключи" }],
              [{ text: "Инструкция" }],
            ],
          },
        },
      } as const);

      if (response === "Хочу новый ключ") {
        return { id: "new_key" };
      } else if (response === "Инструкция") {
        return { id: "guide" };
      } else {
        response satisfies "Мои ключи";
        return { id: "my_keys" };
      }
    },
    async guide() {
      return { id: "root" };
    },
    async my_keys({ send, user, input }) {
      const keys = await getAllKeys(user);

      if (keys.length === 0) {
        send({ text: "У тебя ещё нет ключей" });
        return { id: "root" };
      }
      const keyList = keys.map(
        (x) =>
          `${x.server.name} (${x.server.type}) — ${x.key.name}  \n\`\`\`\n${x.key.accessUrl}\n\`\`\``,
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
        return { id: "root" };
      }

      return { id: "delete_key" };
    },
    async delete_key({ send, input, user }) {
      const allKeys = await getAllKeys(user);
      if (allKeys.length === 0) {
        await send({ text: "У тебя ещё нет ключей" });
        return { id: "root" };
      }

      const response = await input({
        text: `Какой ключ?`,
        options: {
          reply_markup: {
            keyboard: [
              [{ text: "🏠 Главное меню" }],
              ...allKeys.map((key) => [
                { text: `${key.server.name} — ${key.key.name}` },
              ]),
            ],
          },
        },
      } as const);

      if (response === "🏠 Главное меню") {
        return { id: "root" };
      }

      // todo: outline keys reutrn numeric ids, not names
      const [serverName, keyName] = response.split(" — ");
      // find the key id
      //
      const keyPair = allKeys.find(
        (x) => x.server.name === serverName && x.key.name === keyName,
      );
      if (!keyPair) {
        await send({ text: "Ключ не найден" });
        return { id: "root" };
      }

      const outline = new Outline(
        keyPair.server.managementAPI,
        keyPair.server.sha256fingerprint,
      );
      await outline.deleteKey(keyPair.key.id);
      await send({ text: "Операция выполнена" });
      return { id: "root" };
    },
    async new_key({ input, send, user }) {
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

      if (response === "Отмена") {
        return { id: "root" };
      }
      response satisfies "Amnezia" | "Outline";

      const type: ServerInventory["type"] =
        response === "Amnezia" ? "amnezia" : "outline";

      const inventory = await readInventory();
      const serversOfType = inventory.filter((x) => x.type === type);
      const servers = serversOfType.map((x) => [{ text: x.name }]);

      const selectedServer = await input({
        text: `Какой сервер?`,
        options: {
          reply_markup: {
            keyboard: servers,
          },
        },
      } as const);

      const server = serversOfType.find((x) => x.name === selectedServer);
      if (!server) {
        await send({ text: "Сервер не найден" });
        return { id: "root" };
      }

      const outlineClient = new Outline(
        server.managementAPI,
        server.sha256fingerprint,
      );
      const key = await outlineClient.createKey(
        `${userToString(user)}~${randomString()}`,
      );

      const keytext = "```" + key.accessUrl + "```";

      await send(
        createMessage(`Выбран сервер ${server?.name}\n${keytext}`, {
          md: true,
          removeKeyboard: true,
        }),
      );

      return { id: "root" };
    },
  },
  rootState: { id: "root" },
};
