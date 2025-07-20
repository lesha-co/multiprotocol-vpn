/// <reference types="node-telegram-bot-api" />

type Context =
  | { step: "start" }
  | { step: "which_action" }
  | { step: "which_action_keys" }
  | { step: "which_key_to_delete" }
  | { step: "which_protocol" }
  | { step: "which_server"; protocol: "outline" | "amnezia" };

type MessageHandlerResponse = {
  message: {
    text: string;
    options?: TelegramBot.SendMessageOptions;
  };
  setContext?: Context;
  rerun?: true;
};

type MessageHandler = (
  message: TelegramBot.Message,
  context: Context,
) => MessageHandlerResponse | Promise<MessageHandlerResponse>;

type CommandHandler = {
  description: string;
  handler: MessageHandler;
};

type CommandDirectory = Record<string, CommandHandler>;

type OutlineServer = {
  name: string;
  type: "outline";
  managementAPI: string;
  sha256fingerprint: string;
};

type AmneziaServer = {
  name: string;
  type: "amnezia";
};

type Server = OutlineServer | AmneziaServer;
