import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://api.nomad.app";

export const authClient = createAuthClient({
  baseURL: API_URL,
  fetchOptions: {
    credentials: "omit",
  },
  plugins: [
    expoClient({ scheme: "nomad", storagePrefix: "nomad", storage: SecureStore }),
  ],
});
