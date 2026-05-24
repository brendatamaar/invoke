import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { GrpcRequestConfig } from "@invoke/core";
import { grpcReflect } from "./api";
import { useStore } from "../../store";

export function useGrpcReflect(
  request: GrpcRequestConfig | null,
  address: string,
) {
  const set = useStore((s) => s.set);

  const query = useQuery({
    queryKey: ["grpcReflect", address, request?.protosetBase64 ?? null],
    queryFn: () => grpcReflect(request!),
    enabled: !!request && !!address,
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
      return;
    }
    if (query.data) {
      set({
        grpcMethods: query.data.methods,
        grpcStatus: `${query.data.methods.length} methods found`,
      });
    }
  }, [query.isFetching, query.isError, query.data, set]);

  return query;
}
