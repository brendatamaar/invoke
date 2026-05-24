import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MockRoute } from "@invoke/core";
import { clearMockLogs, loadMockRoutes, syncMockRoutes } from "./api";

export const MOCK_DATA_KEY = ["mockData"] as const;

type MockData = Awaited<ReturnType<typeof loadMockRoutes>>;

export function useMockData() {
  return useQuery({
    queryKey: MOCK_DATA_KEY,
    queryFn: loadMockRoutes,
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
  });
}

export function useSyncMockRoutes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: syncMockRoutes,
    onMutate: async (newRoutes: MockRoute[]) => {
      await queryClient.cancelQueries({ queryKey: MOCK_DATA_KEY });
      const previous = queryClient.getQueryData<MockData>(MOCK_DATA_KEY);
      queryClient.setQueryData<MockData>(MOCK_DATA_KEY, (old) =>
        old ? { ...old, routes: newRoutes } : old,
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(MOCK_DATA_KEY, ctx.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: MOCK_DATA_KEY }),
  });
}

export function useClearMockLogs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clearMockLogs,
    onSuccess: () =>
      queryClient.setQueryData<MockData>(MOCK_DATA_KEY, (old) =>
        old ? { ...old, logs: [], totalLogs: 0 } : old,
      ),
  });
}
