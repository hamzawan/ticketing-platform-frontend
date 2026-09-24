"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ACCESS_TOKEN_STORAGE_KEY, getEvents, type OrganizerEvent } from "@/lib/api";
import { CreateEventForm } from "../../create/create-event-form";

export default function EditEventPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [event, setEvent] = useState<OrganizerEvent | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("loading");
      try {
        const token =
          typeof window !== "undefined" ? window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) : null;
        const events = await getEvents(token);
        const found = events.find((e) => e.id === id) ?? null;
        if (cancelled) return;

        if (!found) {
          setErrorMessage("Event not found.");
          setStatus("error");
          return;
        }

        setEvent(found);
        setStatus("ready");
      } catch (err) {
        if (!cancelled) {
          setErrorMessage(err instanceof Error ? err.message : "Unknown error");
          setStatus("error");
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (status === "loading") {
    return (
      <div className="p-4 sm:p-6 max-w-2xl">
        <p className="text-sm text-muted-foreground py-6 text-center">Loading event…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="p-4 sm:p-6 space-y-5 max-w-2xl">
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-2xl px-4 py-3">
          Failed to load event{errorMessage ? `: ${errorMessage}` : "."}
        </div>
        <button
          onClick={() => router.push("/organizer/events")}
          className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
        >
          ← Back to My Events
        </button>
      </div>
    );
  }

  return <CreateEventForm eventId={id} initialEvent={event!} />;
}
