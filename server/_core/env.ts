import { getRuntimeEnv } from "./runtime";

export const ENV = {
  get appId() { return getRuntimeEnv().VITE_APP_ID ?? ""; },
  get cookieSecret() { return getRuntimeEnv().JWT_SECRET ?? ""; },
  get databaseUrl() { return getRuntimeEnv().DATABASE_URL ?? ""; },
  get databaseSsl() { return getRuntimeEnv().DATABASE_SSL === "true"; },
  get oAuthServerUrl() { return getRuntimeEnv().OAUTH_SERVER_URL ?? ""; },
  get ownerOpenId() { return getRuntimeEnv().OWNER_OPEN_ID ?? ""; },
  get isProduction() { return getRuntimeEnv().NODE_ENV === "production"; },
  get forgeApiUrl() { return getRuntimeEnv().BUILT_IN_FORGE_API_URL ?? ""; },
  get forgeApiKey() { return getRuntimeEnv().BUILT_IN_FORGE_API_KEY ?? ""; },
  get vapidPublicKey() { return getRuntimeEnv().VAPID_PUBLIC_KEY ?? ""; },
  get vapidPrivateKey() { return getRuntimeEnv().VAPID_PRIVATE_KEY ?? ""; },
  get vapidSubject() { return getRuntimeEnv().VAPID_SUBJECT ?? "mailto:ssbmbwuugame@gmail.com"; },
};
