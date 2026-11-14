function clampNonNegative(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

function normalizeCaptionSegment(input, index) {
  const text = String(input && input.text != null ? input.text : "")
    .replace(/\s+/g, " ")
    .trim();
  const startTime = clampNonNegative(input && input.startTime);
  let endTime = clampNonNegative(input && input.endTime);
  if (endTime < startTime) endTime = startTime;
  const language = String((input && input.language) || "und").trim() || "und";
  const source = String((input && input.source) || "rendered-caption");
  const id =
    (input && input.id) ||
    [language, startTime.toFixed(3), endTime.toFixed(3), index || 0].join(":");

  const segment = {
    id,
    text,
    startTime,
    endTime,
    language,
    source,
  };
  if (input && typeof input.confidence === "number") {
    segment.confidence = input.confidence;
  }
  return segment;
}

function mergeSegments(existing, incoming) {
  const map = new Map();
  for (const item of existing || []) {
    const seg = normalizeCaptionSegment(item);
    if (seg.text) map.set(seg.id, seg);
  }
  for (const [index, item] of (incoming || []).entries()) {
    const seg = normalizeCaptionSegment(item, index);
    if (!seg.text) continue;
    map.set(seg.id, seg);
  }
  return Array.from(map.values()).sort((a, b) => a.startTime - b.startTime);
}

function activeSegmentId(segments, currentTime) {
  const t = Number(currentTime);
  if (!Number.isFinite(t)) return null;
  let fallback = null;
  for (const seg of segments || []) {
    if (t >= seg.startTime && t <= seg.endTime) return seg.id;
    if (t >= seg.startTime) fallback = seg.id;
  }
  return fallback;
}

const GesturaCaptions = {
  normalizeCaptionSegment,
  mergeSegments,
  activeSegmentId,
};
globalThis.GesturaCaptions = GesturaCaptions;
if (typeof module !== "undefined") module.exports = GesturaCaptions;
