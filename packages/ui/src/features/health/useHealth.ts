import { useQuery } from "@tanstack/react-query";
import { ping } from "./api";

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: ping,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
    retry: false,
  });
}
