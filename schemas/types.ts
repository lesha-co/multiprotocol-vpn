import z from "zod";

export const OutlineServer = z.object({
  name: z.string(),
  serverId: z.string(),
  metricsEnabled: z.boolean(),
  createdTimestampMs: z.number(),
  version: z.string(),
  portForNewAccessKeys: z.number(),
  hostnameForAccessKeys: z.string(),
});

export type OutlineServer = z.infer<typeof OutlineServer>;

export const Key = z.object({
  id: z.string(),
  name: z.string(),
  password: z.string(),
  port: z.number(),
  method: z.string(),
  accessUrl: z.string(),
});
export type Key = z.infer<typeof Key>;

export const ListKeysResponse = z.object({
  accessKeys: z.array(Key),
});

export type ListKeysResponse = z.infer<typeof ListKeysResponse>;

export const OutlineServerInventory = z.object({
  name: z.string(),
  type: z.literal("outline"),
  managementAPI: z.string(),
  sha256fingerprint: z.string(),
});

export const AmneziaServerInventory = z.object({
  name: z.string(),
  type: z.literal("amnezia"),
  managementAPI: z.string(),
  sha256fingerprint: z.string(),
});

export const ServerInventory = z.union([
  OutlineServerInventory,
  AmneziaServerInventory,
]);

export type OutlineServerInventory = z.infer<typeof OutlineServerInventory>;
export type AmneziaServerInventory = z.infer<typeof AmneziaServerInventory>;
export type ServerInventory = z.infer<typeof ServerInventory>;
