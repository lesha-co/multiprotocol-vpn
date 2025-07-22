import z from "zod";

export const Config = z.object({
  SERVER_IP: z.object({
    serverIP: z.string(),
    serverPort: z.string(),
    dns: z.string(),
  }),
  SERVER_KEYS: z.object({
    PUBLIC_KEY: z.string(),
    PRIVATE_KEY: z.string(),
  }),
  ADMIN: z.object({
    HTTPS_KEY: z.string(),
    ADMIN_PORT: z.string(),
    SECRET_ENDPOINT: z.string(),
  }),
  VPN_PARAMS: z.string(),
  SERVER_INTERFACE_CONFIG: z.string(),
  USER_KEYS_ROOT: z.string(),
  CLIENT_IP_BASE: z.string(),
});

export type Config = z.infer<typeof Config>;
