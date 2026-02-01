"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ChunkLoadErrorHandler() {
  const router = useRouter();

  useEffect(() => {
    console.log("ChunkLoadErrorHandler: Listener attached");

    const reloadPage = () => {
      console.warn(
        "New version detected (chunk load failed). Reloading page...",
      );
      // Use router.refresh to refresh server components
      router.refresh();
      // Then reload the page to ensure chunks are re-fetched
      setTimeout(() => {
        window.location.reload();
      }, 100);
    };

    const handleChunkError = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      console.log("ChunkLoadErrorHandler: Caught rejection", error);

      // Check if the error is a chunk load error (Webpack usually throws this with a specific message or name)
      const isChunkLoadError =
        error?.name === "ChunkLoadError" ||
        error?.name === "AsyncChunkLoadError" ||
        (error?.message && /Loading chunk .* failed/.test(error.message));

      if (isChunkLoadError) {
        event.preventDefault();
        reloadPage();
      }
    };

    // Handle global errors (catches chunk load errors from failed script tags)
    const handleError = (event: ErrorEvent) => {
      console.log("ChunkLoadErrorHandler: Global error caught", event);

      // Check if the error is related to chunk loading
      const isChunkError =
        event.message?.includes("Loading chunk") ||
        event.message?.includes("ChunkLoadError") ||
        (event.filename && event.filename.includes("/_next/static/chunks/")) ||
        (typeof event.error === "object" &&
          event.error?.name === "ChunkLoadError");

      if (isChunkError) {
        event.preventDefault();
        reloadPage();
      }
    };

    // Catch script load failures (404s on chunk files)
    const handleScriptError = (event: Event) => {
      const target = event.target as HTMLScriptElement;
      if (
        target &&
        target.src &&
        target.src.includes("/_next/static/chunks/")
      ) {
        console.warn("ChunkLoadErrorHandler: Script load failed", target.src);
        reloadPage();
      }
    };

    window.addEventListener("unhandledrejection", handleChunkError);
    window.addEventListener("error", handleError);
    document.addEventListener("error", handleScriptError, true);

    return () => {
      window.removeEventListener("unhandledrejection", handleChunkError);
      window.removeEventListener("error", handleError);
      document.removeEventListener("error", handleScriptError, true);
    };
  }, [router]);

  return null;
}
