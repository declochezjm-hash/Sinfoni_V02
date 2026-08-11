import { QueryClient } from '@tanstack/react-query';

/** Instance partagée — invalidation / purge après logout ou refresh session. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      networkMode: 'online',
    },
  },
});
