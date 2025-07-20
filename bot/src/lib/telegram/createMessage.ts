import TelegramBot from "node-telegram-bot-api";

export function createMessage(
  text: string,
  options?: {
    md?: true;
    removeKeyboard?: true;
    keyboard?: string[][];
  } & TelegramBot.SendMessageOptions,
) {
  if (!options) {
    return { text };
  }
  let { md, removeKeyboard, keyboard, ...opts } = options;

  if (md) {
    opts.parse_mode = "MarkdownV2";
  }
  if (removeKeyboard) {
    opts.reply_markup = {
      remove_keyboard: true,
    };
  } else if (keyboard) {
    opts.reply_markup = {
      keyboard: keyboard.map((row) => row.map((text) => ({ text }))),
    };
  }
  return { text, options: opts };
}
