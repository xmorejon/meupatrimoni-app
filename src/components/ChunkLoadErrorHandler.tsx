"use client";

import { useEffect } from "react";

export default function ChunkLoadErrorHandler() {
  useEffect(() => {
    console.log("ChunkLoadErrorHandler: Listener attached");

    const handleChunkError = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      console.log("ChunkLoadErrorHandler: Caught rejection", error);

      // Check if the error is a chunk load error (Webpack usually throws this with a specific message or name)
      const isChunkLoadError =
        error?.name === "ChunkLoadError" ||
        error?.name === "AsyncChunkLoadError" ||
        (error?.message && /Loading chunk .* failed/.test(error.message));

      if (isChunkLoadError) {
        console.warn(
          "New version detected (chunk load failed). Reloading page...",
        );
        window.location.reload();
      }
    };

    window.addEventListener("unhandledrejection", handleChunkError);

    return () => {
      window.removeEventListener("unhandledrejection", handleChunkError);
    };
  }, []);

  return null;
}
