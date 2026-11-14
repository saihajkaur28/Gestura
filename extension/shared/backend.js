(function () {
  const DEFAULT_BASE_URL = "http://127.0.0.1:8000";

  async function interpretCaptions(segments, context, baseUrl) {
    const url = (baseUrl || DEFAULT_BASE_URL).replace(/\/$/, "") + "/v1/captions/interpret";
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segments: segments || [], context: context || {} }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, status: response.status, error: body.detail || "Backend error: " + response.status };
    }
    return { ok: true, result: body };
  }

  const GesturaBackend = { baseUrl: DEFAULT_BASE_URL, interpretCaptions };
  globalThis.GesturaBackend = GesturaBackend;
  if (typeof module !== "undefined") module.exports = { interpretCaptions, DEFAULT_BASE_URL: GesturaBackend.baseUrl };
})();
