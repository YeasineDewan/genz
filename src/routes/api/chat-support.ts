// Support chat AI endpoint. Public — returns AI text only, no DB writes.
// The browser persists conversation + messages itself using RLS.
import { createFileRoute } from "@tanstack/react-router";

type Msg = { role: "system" | "user" | "assistant"; content: string };

const SYSTEM_PROMPT = `You are "Z", the friendly AI concierge for GenZ — a loud, pop-art streetwear brand for the chronically online.
Tone: warm, playful, concise (2-3 short sentences max, emojis welcome but light).
You can help with: product recommendations, sizing, shipping/returns, order status guidance, style advice, and general FAQ.
You cannot: process refunds, change orders, or access personal account data. For those, tell the customer to tap "Talk to a human" and an admin will jump in.
If a question is out of scope or ambiguous, politely suggest escalating to a human.`;

export const Route = createFileRoute("/api/chat-support")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { messages?: Msg[] };
          const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
          if (!messages.length) return new Response("messages required", { status: 400 });

          const key = process.env.LOVABLE_API_KEY;
          if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

          const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Lovable-API-Key": key,
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
            }),
          });

          if (res.status === 429) {
            return Response.json({ text: "I'm getting a lot of requests right now — try again in a moment. 💛" }, { status: 200 });
          }
          if (res.status === 402) {
            return Response.json({ text: "AI credits are out. Tap 'Talk to a human' and we'll take it from here." }, { status: 200 });
          }
          if (!res.ok) {
            const t = await res.text();
            return new Response(`Gateway error: ${t}`, { status: 502 });
          }

          const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
          const text = data.choices?.[0]?.message?.content?.trim() || "Hmm, I didn't catch that. Try again?";
          return Response.json({ text });
        } catch (e) {
          return new Response(`Error: ${(e as Error).message}`, { status: 500 });
        }
      },
    },
  },
});
