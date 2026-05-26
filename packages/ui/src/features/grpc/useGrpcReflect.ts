import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { GrpcRequestConfig } from "@invoke/core";
import { grpcReflect } from "./api";
import { useStore } from "../../store";

export function useGrpcReflect(
  request: GrpcRequestConfig | null,
  address: string,
) {
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

  useEffect(() => {
    if (query.isFetching) {
      set({ grpcStatus: "Reflecting..." });
      return;
    }
    if (query.isError) {
      set({ grpcStatus: "Error" });
    }
  }, [query.isFetching, query.isError, set]);

  const fetchReflect = () =>
    queryClient.fetchQuery({
      queryKey,
      queryFn: () => grpcReflect(request!),
      staleTime: 0,
    });

  return { ...query, fetchReflect };
}
