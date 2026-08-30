"use client";
import useSWR from "swr";
import { api } from "./api";

export function useApi<T>(path: string | null, refreshInterval = 0) {
  return useSWR<T>(path, (p: string) => api.get<T>(p), {
    refreshInterval,
    revalidateOnFocus: true,
  });
}
