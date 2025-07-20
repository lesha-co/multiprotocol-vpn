import TelegramBot from "node-telegram-bot-api";
import type { Consumer } from "../asyncTools/classifier.ts";
import { executeStateMachine } from "../stateMachineRunner.ts";
import type { State, StateMachine } from "../stateMachineRunner.ts";

export type Meta = {
  chat: TelegramBot.Chat;
  user: TelegramBot.User | undefined;
};

export function getConsumer<T extends State, Context>(
  stateMachine: StateMachine<T, Context>,
  getContext: (
    iter: AsyncIterableIterator<TelegramBot.Message>,
    meta: Meta,
  ) => Context,
): Consumer<TelegramBot.Message, Meta> {
  return async function (messages, meta) {
    const context = getContext(messages(), meta);
    await executeStateMachine(stateMachine, context);
  };
}
