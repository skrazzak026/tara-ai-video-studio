const MODEL_ENDPOINT = "https://queue.fal.run/fal-ai/kling-video/v2.5-turbo/pro/text-to-video";
function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
export async function onRequestPost({ request, env }) {
  if (!env.FAL_KEY || !env.APP_ACCESS_CODE || env.APP_ACCESS_CODE.length &lt; 12) {
    return json({ error: "Administrator must configure FAL_KEY and a 12+ character APP_ACCESS_CODE in Cloudflare Pages secrets." }, 503);
  }
  if (request.headers.get("X-Access-Code") !== env.APP_ACCESS_CODE) {
    return json({ error: "Invalid studio access code." }, 401);
  }
  const size = Number(request.headers.get("content-length") || 0);
  if (size &gt; 10000) return json({ error: "Request is too large." }, 413);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON request." }, 400); }
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  const duration = String(body?.duration ?? "5");
  const aspect_ratio = String(body?.aspect_ratio ?? "16:9");
  if (prompt.length &lt; 10 || prompt.length &gt; 1800) return json({ error: "Enter a prompt between 10 and 1,800 characters." }, 400);
  if (!["5", "10"].includes(duration)) return json({ error: "Duration must be 5 or 10 seconds." }, 400);
  if (!["16:9", "9:16", "1:1"].includes(aspect_ratio)) return json({ error: "Invalid aspect ratio." }, 400);
  try {
    const provider = await fetch(MODEL_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Key ${env.FAL_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, duration, aspect_ratio, negative_prompt: "blurry, low quality, distorted, text, watermark" }),
    });
    if (!provider.ok) {
      return json({ error: `Video provider rejected the request (HTTP ${provider.status}). Check credits, API key, and model access.` }, 502);
    }
    const data = await provider.json();
    if (!data.request_id || !/^[\w-]{8,128}$/.test(data.request_id)) {
      return json({ error: "Provider returned an unexpected job ID." }, 502);
    }
    return json({ request_id: data.request_id, status: "IN_QUEUE" }, 202);
  } catch {
    return json({ error: "Unable to contact video provider. Please retry." }, 502);
  }
}
