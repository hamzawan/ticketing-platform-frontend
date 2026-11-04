"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, WifiOff } from "lucide-react";
import { ApiError } from "@/lib/api";
import { clearSession } from "@/lib/auth";

// Single place that turns a failed load into a user-facing message, so every
// organizer screen reacts the same way to offline / expired session / server errors.
function describe(error: unknown): { title: string; message: string; expired: boolean } {
  if (error instanceof ApiError && error.status === 401) {
    return { title: "Session expired", message: "Please sign in again to continue.", expired: true };
  }
  if (error instanceof TypeError) {
    return {
      title: "No connection",
      message: "Can't reach the server. Check your internet connection and try again.",
      expired: false,
    };
  }
  if (error instanceof ApiError && error.status >= 500) {
    return { title: "Server error", message: "Something went wrong on our side. Please try again shortly.", expired: false };
  }
  return {
    title: "Couldn't load this page",
    message: error instanceof Error && error.message ? error.message : "Something went wrong.",
    expired: false,
  };
}

export function LoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const router = useRouter();
  const { title, message, expired } = describe(error);

  useEffect(() => {
    if (!expired) return;
    clearSession();
    router.replace("/");
  }, [expired, router]);

  return (
    <div className="bg-card border border-border rounded-2xl p-10 flex flex-col items-center text-center gap-3">
      <WifiOff className="w-8 h-8 text-muted-foreground" />
      <h3 className="text-sm font-bold">{title}</h3>
      <p className="text-xs text-muted-foreground max-w-sm">{message}</p>
      {!expired && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Try again
        </button>
      )}
    </div>
  );
}
