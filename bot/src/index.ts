import TelegramBot from "node-telegram-bot-api";
import {
  getBot,
  classifier,
  getConsumer,
} from "telegram-bot-framework-state-machine";
import type { Meta } from "telegram-bot-framework-state-machine";
import pipe from "callback-to-async-generator";

import { stateMachine } from "./machine.ts";
import type { TelegramDialogContext } from "./machine.ts";

import { readConfigFromEnv } from "../../facilities/readConfig.ts";

readConfigFromEnv();

const bot = getBot();
const p = pipe<TelegramBot.Message>();
bot.on("message", p.send);

await classifier<TelegramBot.Message, Meta>(
  p.generator,
  (m) => m.chat.id,
  (m) => ({
    chat: m.chat,
    user: m.from,
  }),
  getConsumer(stateMachine, getContext),
);

function getContext(
  iterator: AsyncIterableIterator<TelegramBot.Message>,
  meta: Meta,
): TelegramDialogContext {
  const user = meta.user;
  if (user === undefined) throw new Error("User not found");

  let context: TelegramDialogContext = {
    async send(s) {
      let msg = structuredClone(s);
      logMessage(user, "out", msg.text ?? "<no text>");
      await bot.sendMessage(meta.chat.id, msg.text ?? "no text", msg.options);
    },

    async get() {
      const r = await iterator.next();
      if (r.done) {
        throw new Error("No more messages");
      }
      logMessage(user, "in", r.value.text ?? "<no text>");
      return r.value.text ?? "";
    },

    async input(msg) {
      const responses = (
        "keyboard" in msg.options.reply_markup
          ? msg.options.reply_markup.keyboard
          : []
      )
        .flat()
        .map((x) => x.text);

      while (true) {
        await context.send(msg);
        const reply = await context.get();
        if (responses.includes(reply)) {
          return reply;
        }
      }
    },
    user,
  };
  return context;
}

function logMessage(
  user: TelegramBot.User,
  dir: "in" | "out",
  contents: string,
) {
  const d = dir === "in" ? " |>" : "<| ";
  const lines = contents.split("\n");
  const username = user.username ?? user.id.toString();
  const usernameSpaces = "".padStart(username.length);
  console.log(`${user.username} ${d} ${lines[0]}`);
  for (const line of lines.slice(1)) {
    console.log(`${usernameSpaces} ${d} ${line}`);
  }
}
