import TelegramBot from "node-telegram-bot-api";
import assert from "node:assert";

export function getBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  assert(token, "TELEGRAM_BOT_TOKEN is not set");
  const bot = new TelegramBot(token, { polling: true });
  return bot;
}
