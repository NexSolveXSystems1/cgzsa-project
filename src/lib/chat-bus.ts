/**
 * Delivery of a staff reply to a waiting visitor.
 *
 * Design review §14: server-sent events rather than WebSockets. Within one
 * process this is an EventEmitter; across instances the same interface is
 * backed by PostgreSQL LISTEN/NOTIFY, which is why publish() is async.
 */
import { EventEmitter } from "node:events";

export type Frame = {
  id: string;
  author: "VISITOR" | "ASSISTANT" | "STAFF" | "SYSTEM";
  body: string;
  staffName?: string | null;
  sources?: { title: string; url: string }[];
};

const globalForBus = globalThis as unknown as { __chatBus?: EventEmitter };
const bus = globalForBus.__chatBus ?? new EventEmitter();
bus.setMaxListeners(0);
globalForBus.__chatBus = bus;

export async function publish(conversationId: string, frame: Frame) {
  bus.emit(conversationId, frame);
}

export function subscribe(conversationId: string, fn: (f: Frame) => void) {
  bus.on(conversationId, fn);
  return () => bus.off(conversationId, fn);
}
