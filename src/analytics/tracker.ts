export type EventType =
  | "search_initiated"
  | "deeplink_generated"
  | "deeplink_clicked"
  | "results_rendered"
  | "destination_suggested"
  | "date_suggested"
  | "intent_detected"
  | "intent_refined"
  | "city_resolved"
  | "options_ranked";

export interface InteractionEvent {
  event_type: EventType;
  timestamp: string;
  session_id?: string;
  properties: Record<string, unknown>;
}

export interface TrackEventResult {
  tracked: boolean;
  event: InteractionEvent;
  events_in_session: number;
}

// In-memory event store (per session)
const eventStore: InteractionEvent[] = [];

export function trackInteractionEvent(
  eventType: EventType,
  properties: Record<string, unknown>,
  sessionId?: string,
): TrackEventResult {
  const event: InteractionEvent = {
    event_type: eventType,
    timestamp: new Date().toISOString(),
    session_id: sessionId,
    properties,
  };

  eventStore.push(event);

  return {
    tracked: true,
    event,
    events_in_session: eventStore.filter((e) => !sessionId || e.session_id === sessionId).length,
  };
}

export function getSessionEvents(sessionId?: string): InteractionEvent[] {
  if (!sessionId) return [...eventStore];
  return eventStore.filter((e) => e.session_id === sessionId);
}

export function clearEvents(): void {
  eventStore.length = 0;
}
