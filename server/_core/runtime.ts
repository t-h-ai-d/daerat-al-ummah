export type HyperdriveBinding = {
  host: string;
  port: number | string;
  user: string;
  password: string;
  database: string;
};

export type R2Object = {
  httpMetadata?: { contentType?: string };
  arrayBuffer(): Promise<ArrayBuffer>;
};

export type R2BucketBinding = {
  put(key: string, value: Buffer | Uint8Array | string, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  get(key: string): Promise<R2Object | null>;
};

export type CloudflareWorkerEnv = Record<string, unknown> & {
  JWT_SECRET?: string;
  HYPERDRIVE?: HyperdriveBinding;
  MEDIA?: R2BucketBinding;
  ASSETS?: { fetch(request: Request): Promise<Response> };
};

let cloudflareRuntime: CloudflareWorkerEnv | null = null;

export function configureCloudflareRuntime(env: CloudflareWorkerEnv) {
  cloudflareRuntime = env;
}

export function getRuntimeEnv(): Record<string, string | undefined> {
  if (cloudflareRuntime) {
    return Object.fromEntries(
      Object.entries(cloudflareRuntime).flatMap(([key, value]) => typeof value === "string" ? [[key, value]] : []),
    );
  }
  return process.env;
}

export function getHyperdriveBinding() {
  return cloudflareRuntime?.HYPERDRIVE;
}

export function getR2MediaBinding() {
  return cloudflareRuntime?.MEDIA;
}
