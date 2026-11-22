import axios from "axios";

const TOKEN_KEY = "auth_token";

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Automatically attach the JWT to every outgoing request
axiosClient.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Clear stale token if the backend rejects it with 401
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      tokenStorage.clear();
    }
    return Promise.reject(error);
  },
);

export function extractApiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.error?.message || err.message;
  }
  return err instanceof Error ? err.message : "Unexpected error";
}