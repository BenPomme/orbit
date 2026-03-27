import { Platform } from "react-native";

const storageKey = "orbit-household.auth-token";
let inMemoryToken: string | null = null;

export async function readStoredToken() {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return window.localStorage.getItem(storageKey);
  }

  return inMemoryToken;
}

export async function writeStoredToken(token: string) {
  inMemoryToken = token;

  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.localStorage.setItem(storageKey, token);
  }
}

export async function clearStoredToken() {
  inMemoryToken = null;

  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.localStorage.removeItem(storageKey);
  }
}
