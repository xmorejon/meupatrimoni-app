import type { Metadata } from "next";
import "@/app/globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/context/AuthContext";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import ChunkLoadErrorHandler from "@/components/ChunkLoadErrorHandler";

export const metadata: Metadata = {
  title: "MeuPatrimoni",
  description: "Track your net worth in real-time.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ca" className="dark">
      <head>
        <meta name="theme-color" content="#000000" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>{children}</AuthProvider>
        <Toaster />
        <ServiceWorkerRegistrar />
        <ChunkLoadErrorHandler />
      </body>
    </html>
  );
}
