import { QueryClient } from "@tanstack/react-query"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Provide a default no-op queryFn to satisfy TanStack Query v4 requirement.
      // Most queries in this app use `enabled: false` and are hydrated via SSG/SSR.
      // If any query actually needs to fetch on the client, pass an explicit `queryFn` at callsite.
      // Return null (not undefined) to avoid "Query data cannot be undefined" errors if ever invoked.
      queryFn: async () => null as unknown,
    },
  },
})
