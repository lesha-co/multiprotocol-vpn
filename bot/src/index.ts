import TelegramBot from "node-telegram-bot-api";
import { classifier } from "./lib/asyncTools/classifier.ts";
import { pipe } from "./lib/asyncTools/pipe.ts";
import { getBot } from "./lib/telegram/getBot.ts";
import { stateMachine } from "./machine.ts";
import type { TelegramDialogContext } from "./machine.ts";
import { getConsumer } from "./lib/telegram/getConsumer.ts";
import type { Meta } from "./lib/telegram/getConsumer.ts";

const bot = getBot();
const p = pipe<TelegramBot.Message>();
bot.on("message", p.submit);

function getContext(
  iterator: AsyncIterableIterator<TelegramBot.Message>,
  meta: Meta,
): TelegramDialogContext {
  const user = meta.user;
  if (user === undefined) throw new Error("User not found");

  let context: TelegramDialogContext = {
    async send(s) {
      let msg = structuredClone(s);
      bot.sendMessage(meta.chat.id, msg.text, msg.options);
    },

    async get() {
      const r = await iterator.next();
      if (r.done) {
        throw new Error("No more messages");
      }
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

await classifier<TelegramBot.Message, Meta>(
  p.generator,
  (m) => m.chat.id,
  (m) => ({
    chat: m.chat,
    user: m.from,
  }),
  getConsumer(stateMachine, getContext),
);
