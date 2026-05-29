import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { GrpcRequestConfig } from "@invoke/core";
import { grpcReflect } from "./api";
import { useStore } from "../../store";

export function useGrpcReflect(request: GrpcRequestConfig | null, address: string) {
  const set = useStore((s) => s.set);
  const queryClient = useQueryClient();

  const queryKey = ["grpcReflect", address, request?.protosetBase64 ?? null];

  const query = useQuery({
    queryKey,
    queryFn: () => grpcReflect(request!),
    enabled: false,
    staleTime: Infinity,
    retry: false,
  });

  const fetchReflect = async () => {
    set({ grpcStatus: "Reflecting..." });
    try {
      const result = await queryClient.fetchQuery({
        queryKey,
        queryFn: () => grpcReflect(request!),
        staleTime: 0,
      });
      return result;
    } catch (error) {
      set({ grpcStatus: "Error" });
      throw error;
    }
  };

  return { ...query, fetchReflect };
}
