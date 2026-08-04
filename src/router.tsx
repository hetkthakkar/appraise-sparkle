import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { isBusy } from "./lib/busy";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 0,
        refetchOnWindowFocus: "always",
        refetchOnReconnect: "always",
        refetchOnMount: "always",
        // Calm 60s background poll, paused while a save/upload is in flight.
        refetchInterval: () => (isBusy() ? false : 60_000),
      },
    },
  });



  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
