const KEY = "ARK-QUIZES.db.v1";
const listeners = new Set();

function empty() {
  return {
    users: [],
    quizzes: [],
    questions: [],
    participants: [],
    teams: [],
    attempts: [],
    answers: [],
    gameWinners: [],
    presence: {},
  };
}

function readRaw() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function parse(raw) {
  if (!raw) return empty();
  try {
    return { ...empty(), ...JSON.parse(raw) };
  } catch {
    return empty();
  }
}

// Read-through cache: always reflects the latest persisted data written by ANY tab.
let cacheRaw = undefined;
let cache = empty();

export function getState() {
  const raw = readRaw();
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    cache = parse(raw);
  }
  return cache;
}

/**
 * Transactional write. The mutation is applied to a FRESH copy of the latest
 * persisted data (never a stale in-memory copy), so concurrent tabs cannot
 * overwrite each other's changes. If fn throws, nothing is written.
 * If fn returns `false`, nothing is written (no-op).
 */
export function mutate(fn) {
  const draft = parse(readRaw());
  const result = fn(draft);
  if (result === false) return result;
  const raw = JSON.stringify(draft);
  localStorage.setItem(KEY, raw);
  cacheRaw = raw;
  cache = draft;
  return result;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify(envelope) {
  listeners.forEach((fn) => {
    try {
      fn(envelope);
    } catch {
      /* ignore listener errors */
    }
  });
}

export const channel =
  typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel("ARK-QUIZES-realtime")
    : { postMessage() {}, addEventListener() {}, close() {} };

export function emit(event, payload = {}) {
  const envelope = { event, payload, ts: Date.now() };
  notify(envelope);
  try {
    channel.postMessage(envelope);
  } catch {
    /* ignore */
  }
}

// Realtime events from other tabs (admin → participants and vice versa)
channel.addEventListener?.("message", (msg) => {
  if (msg?.data?.event) notify(msg.data);
});

// Any data write from another tab triggers a refresh in this tab
window.addEventListener("storage", (e) => {
  if (e.key === KEY) notify({ event: "db:sync", payload: {}, ts: Date.now() });
});

export function oid(prefix = "") {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export function now() {
  return Date.now();
}

export function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
