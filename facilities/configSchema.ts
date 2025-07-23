import z from "zod";

export const Config = z.object({
  WIREGUARD_EXTERNAL_IP: z.string(),
  WIREGUARD_PORT: z.string(),
  WIREGUARD_DNS: z.string(),
  WIREGUARD_VPN_PARAMS: z.string(),
  WIREGUARD_SERVER_INTERFACE_CONFIG: z.string(),
  WIREGUARD_USER_KEYS_ROOT: z.string(),
  WIREGUARD_CLIENT_IP_BASE: z.string(),
  WIREGUARD_PUBLIC_KEY: z.string(),
  WIREGUARD_PRIVATE_KEY: z.string(),
  WIREGUARD_ADMIN_PORT: z.string(),
  WIREGUARD_ADMIN_SECRET_ENDPOINT: z.string(),
  HTTPS_KEY_PATH: z.string(),
  HTTPS_CRT_PATH: z.string(),

  SB_PUBLIC_IP: z.string(),
  SB_STATE_DIR: z.string(),
  SB_API_PORT: z.string(),
  SB_API_PREFIX: z.string(),
  SB_CERTIFICATE_FILE: z.string(),
  SB_PRIVATE_KEY_FILE: z.string(),
});

export type Config = z.infer<typeof Config>;
