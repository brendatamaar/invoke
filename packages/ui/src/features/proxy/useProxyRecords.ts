import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clearProxyRecords, loadProxyRecords, proxyRecordsToMocks } from "./api";
import { coreStore, useStore } from "../../store";

export const PROXY_RECORDS_KEY = ["proxyRecords"] as const;

export function useProxyRecords() {
  return useQuery({
    queryKey: PROXY_RECORDS_KEY,
    queryFn: loadProxyRecords,
  });
}

export function useClearProxyRecords() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clearProxyRecords,
    onSuccess: () => queryClient.setQueryData(PROXY_RECORDS_KEY, []),
  });
}

export function useImportProxyToMocks() {
  const addToast = useStore((s) => s.addToast);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids?: string[]) => proxyRecordsToMocks(ids),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: PROXY_RECORDS_KEY });
      coreStore
        .setMeta("mockRoutes", result.routes)
        .catch((error: unknown) =>
          addToast(
            "error",
            `Failed to save imported routes: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
    },
  });
}
