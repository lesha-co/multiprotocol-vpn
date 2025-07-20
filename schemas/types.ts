import z from "zod";

export const Server = z.object({
  name: z.string(),
  serverId: z.string(),
  metricsEnabled: z.boolean(),
  createdTimestampMs: z.number(),
  version: z.string(),
  portForNewAccessKeys: z.number(),
  hostnameForAccessKeys: z.string(),
});

export type Server = z.infer<typeof Server>;

export const Key = z.object({
  id: z.string(),
  name: z.string(),
  password: z.string(),
  port: z.number(),
  method: z.string(),
  accessUrl: z.url(),
});
export type Key = z.infer<typeof Key>;

export const ListKeysResponse = z.object({
  accessKeys: z.array(Key),
});

export type ListKeysResponse = z.infer<typeof ListKeysResponse>;
