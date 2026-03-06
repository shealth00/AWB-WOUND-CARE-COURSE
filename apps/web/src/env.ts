const publicEnv = {
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
};

export const webEnv = {
  apiBaseUrl: (publicEnv.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, ""),
};
