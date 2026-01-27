"use client";

import { useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";

export default function ServiceWorkerRegistrar() {
  const { toast } = useToast();

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("SW registered: ", registration);

            // This is the logic to handle updates
            registration.addEventListener("updatefound", () => {
              const newWorker = registration.installing;
              console.log(
                "SW update found, new worker is installing:",
                newWorker,
              );

              if (newWorker) {
                newWorker.addEventListener("statechange", () => {
                  // Has the new service worker been successfully installed?
                  if (newWorker.state === "installed") {
                    // Is there an active service worker controlling the page?
                    if (navigator.serviceWorker.controller) {
                      console.log(
                        "New SW is installed and waiting to activate.",
                      );
                      // Show a toast to the user
                      toast({
                        title: "Nova versió disponible",
                        description:
                          "Hi ha una nova versió de l'aplicació. Recarregueu per actualitzar.",
                        duration: Infinity, // Keep the toast until the user interacts
                        action: (
                          <Button
                            onClick={() => {
                              // Send a message to the waiting service worker to skip waiting
                              newWorker.postMessage({ type: "SKIP_WAITING" });
                            }}
                          >
                            Recarregar
                          </Button>
                        ),
                      });
                    }
                  }
                });
              }
            });
          })
          .catch((registrationError) => {
            console.log("SW registration failed: ", registrationError);
          });

        // Listen for the 'controllerchange' event. This fires when the new
        // service worker has taken control.
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          console.log("SW controller has changed. Reloading page.");
          window.location.reload();
        });
      });
    }
  }, [toast]); // Add toast to dependency array

  return null;
}
