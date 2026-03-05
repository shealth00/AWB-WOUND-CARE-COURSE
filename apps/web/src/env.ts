const publicEnv = {
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
};

function requirePublicEnv(name: "NEXT_PUBLIC_APP_ENV"): string {
  const value = publicEnv[name];

  if (!value) {
    throw new Error(`Missing required web environment variable: ${name}`);
  }

  return value;
}

export const webEnv = {
  apiBaseUrl: (publicEnv.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, ""),
  appEnv: requirePublicEnv("NEXT_PUBLIC_APP_ENV"),
};
