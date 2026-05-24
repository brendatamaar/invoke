import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clearWebhookLogs, loadWebhookLogs } from "./api";

export function useWebhookLogs(webhookId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["webhookLogs", webhookId],
    queryFn: () => loadWebhookLogs(webhookId),
    enabled,
    refetchInterval: enabled ? 2000 : false,
    refetchIntervalInBackground: false,
  });
}

export function useClearWebhookLogs(webhookId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => clearWebhookLogs(webhookId),
    onSuccess: () =>
      queryClient.setQueryData(["webhookLogs", webhookId], []),
  });
}
