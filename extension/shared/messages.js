const TYPES = Object.freeze({
  PAGE_CONTEXT: "GESTURA/PAGE_CONTEXT",
  CAPTIONS_UPDATED: "GESTURA/CAPTIONS_UPDATED",
  PLAYBACK: "GESTURA/PLAYBACK",
  SEEK_TO: "GESTURA/SEEK_TO",
  INTERPRET_CAPTIONS: "GESTURA/INTERPRET_CAPTIONS",
  OPEN_SIDEPANEL: "GESTURA/OPEN_SIDEPANEL",
  GET_STATE: "GESTURA/GET_STATE",
  STATE: "GESTURA/STATE",
  ERROR: "GESTURA/ERROR",
  PING: "GESTURA/PING",
  PONG: "GESTURA/PONG",
});

function isGesturaMessage(message) {
  return Boolean(
    message &&
      typeof message === "object" &&
      typeof message.type === "string" &&
      message.type.startsWith("GESTURA/")
  );
}

function envelope(type, payload) {
  if (!Object.values(TYPES).includes(type)) {
    throw new Error("Unknown Gestura message type: " + type);
  }
  return { type, payload: payload || {}, sentAt: Date.now() };
}

const GesturaMessages = { TYPES, isGesturaMessage, envelope };
globalThis.GesturaMessages = GesturaMessages;
if (typeof module !== "undefined") module.exports = GesturaMessages;
