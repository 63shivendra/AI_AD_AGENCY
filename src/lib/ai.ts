import { clamp } from "@/lib/utils";

export type Concept = {
  angle: string;
  title: string;
  hook: string;
  scenes: { label: string; text: string; sub: string }[];
  cta: string;
  platform: "META" | "TIKTOK";
  score: number;
  predictedCtr: number;
  predictedRoas: number;
  rationale: string;
  factors: string[];
};

export type ClientInput = {
  name: string;
  niche: string;
  area: string;
  city: string;
  phone: string;
  brandColor?: string;
  notes?: string | null;
  proof?: string | null;
  offers: { title: string; description: string; price?: string | null; isPrimary?: boolean }[];
};

const PLAYBOOK: Record<string, { pain: string; urgency: string; cta: string }> = {
  dental: {
    pain: "daant ka dard",
    urgency: "Is hafte ke slots",
    cta: "Appointment book karo",
  },
  bridal: {
    pain: "shaadi ki shopping",
    urgency: "Wedding season booking",
    cta: "Trial book karo",
  },
  coaching: {
    pain: "NEET ki tension",
    urgency: "Naya batch shuru",
    cta: "Free demo lo",
  },
  leather: {
    pain: "export-quality supplier",
    urgency: "Q3 production slots",
    cta: "Sample mangao",
  },
  jewellery: {
    pain: "gold rate ki confusion",
    urgency: "Festive booking",
    cta: "Visit book karo",
  },
  banquet: {
    pain: "shaadi ki venue",
    urgency: "December dates",
    cta: "Venue dekho",
  },
  cnc: {
    pain: "vendor approval ka delay",
    urgency: "7-day vendor audit",
    cta: "Drawing bhejo",
  },
  ivf: {
    pain: "santaan ki chinta",
    urgency: "Free consult slots",
    cta: "Confidential consult",
  },
  sweets: {
    pain: "mithai ki quality",
    urgency: "Diwali gift boxes",
    cta: "Order karo",
  },
};

function playbookFor(niche: string) {
  const n = niche.toLowerCase();
  const key = Object.keys(PLAYBOOK).find((k) => n.includes(k));
  return PLAYBOOK[key ?? "dental"] ?? PLAYBOOK.dental;
}

/** Transparent heuristic — the same scoring runs on Gemini output so numbers stay comparable. */
export function scoreHook(hook: string, area: string) {
  const factors: string[] = [];
  let score = 60;

  if (hook.length <= 38) {
    score += 8;
    factors.push("Short enough to read in the first 2s");
  } else if (hook.length <= 50) {
    score += 3;
    factors.push("Slightly long for a 3s hook");
  } else {
    score -= 6;
    factors.push("Too long — viewers will scroll");
  }

  if (hook.toLowerCase().includes(area.toLowerCase())) {
    score += 7;
    factors.push(`Local signal: "${area}"`);
  }
  if (/\d/.test(hook)) {
    score += 6;
    factors.push("Concrete number / price anchor");
  }
  if (hook.includes("?")) {
    score += 4;
    factors.push("Question creates an open loop");
  }
  if (/(aaj|abhi|sirf|last|khatam|is hafte|is mahine|seats|slots)/i.test(hook)) {
    score += 5;
    factors.push("Urgency cue");
  }
  if (hook.split(/\s+/).length <= 8) {
    score += 4;
    factors.push("Punchy word count");
  }

  const jitter = (hook.length * 7) % 5;
  score = clamp(Math.round(score + jitter), 48, 97);

  return {
    score,
    predictedCtr: Number((1.05 + score / 38).toFixed(1)),
    predictedRoas: Number((1.15 + score / 27).toFixed(1)),
    factors,
  };
}

function fallbackConcepts(client: ClientInput, brief: string, count: number): Concept[] {
  const pb = playbookFor(client.niche);
  const primary = client.offers.find((o) => o.isPrimary) ?? client.offers[0];
  const price = primary?.price && primary.price !== "Free" ? primary.price : null;
  const offerTitle = primary?.title ?? "Aaj hi visit karo";
  const cleanTitle = offerTitle.split("—")[0].trim();
  // Never repeat the price: "₹199 Full Checkup" should not become "₹199 mein ₹199 Full Checkup".
  const priceHook = price && !cleanTitle.includes(price) ? `${price} mein ${cleanTitle}` : cleanTitle;
  // Proof comes from the owner, never invented by the model. Fall back to something verifiable.
  const proof = client.proof?.trim() || "Seedha owner se baat";
  const briefNote = brief.trim();

  const drafts: Omit<Concept, "score" | "predictedCtr" | "predictedRoas" | "factors">[] = [
    {
      angle: "Problem-first",
      title: `${client.niche} — pain hook`,
      hook: `${client.area} mein ${pb.pain}?`,
      scenes: [
        { label: "Hook", text: `${client.area} mein ${pb.pain}?`, sub: `${client.area}, ${client.city}` },
        { label: "Offer", text: offerTitle, sub: primary?.description ?? "" },
        { label: "CTA", text: pb.cta, sub: `+91 ${client.phone}` },
      ],
      cta: pb.cta,
      platform: "META",
      rationale:
        "Pain-led openings work when the viewer already feels the problem. The area name in line one buys 2–3 extra seconds of attention from neighbours.",
    },
    {
      angle: "Price-led",
      title: `${client.niche} — price anchor`,
      hook: priceHook,
      scenes: [
        { label: "Hook", text: priceHook, sub: "Sirf is hafte" },
        { label: "Offer", text: offerTitle, sub: primary?.description ?? "" },
        { label: "CTA", text: pb.cta, sub: `+91 ${client.phone}` },
      ],
      cta: pb.cta,
      platform: "META",
      rationale:
        "A visible price filters out bargain hunters and pre-qualifies the click. Cheap clicks are useless if the lead can never afford you.",
    },
    {
      angle: "Social proof",
      title: `${client.niche} — proof hook`,
      hook: `${proof} — ${client.area} mein`,
      scenes: [
        { label: "Hook", text: proof, sub: `${client.area} ka bharosa` },
        { label: "Offer", text: offerTitle, sub: primary?.description ?? "" },
        { label: "CTA", text: pb.cta, sub: `+91 ${client.phone}` },
      ],
      cta: pb.cta,
      platform: "META",
      rationale:
        "Proof beats promises. Use a fact the owner can defend on the phone — never a made-up patient or customer count.",
    },
    {
      angle: "Urgency",
      title: `${client.niche} — scarcity hook`,
      hook: `${pb.urgency} — ${client.area}`,
      scenes: [
        { label: "Hook", text: pb.urgency, sub: "Abhi decide karo" },
        { label: "Offer", text: offerTitle, sub: primary?.description ?? "" },
        { label: "CTA", text: pb.cta, sub: `+91 ${client.phone}` },
      ],
      cta: pb.cta,
      platform: "TIKTOK",
      rationale:
        "Scarcity lifts CTR but decays fast — keep it truthful and rotate every 10 days so it doesn't become wallpaper.",
    },
  ];

  if (briefNote) {
    drafts.push({
      angle: "Brief-led",
      title: "Custom brief",
      hook: briefNote.slice(0, 40),
      scenes: [
        { label: "Hook", text: briefNote.slice(0, 42), sub: `${client.area}, ${client.city}` },
        { label: "Offer", text: offerTitle, sub: primary?.description ?? "" },
        { label: "CTA", text: pb.cta, sub: `+91 ${client.phone}` },
      ],
      cta: pb.cta,
      platform: "META",
      rationale:
        "Generated directly from your brief. Treat it as the control and let the other angles challenge it.",
    });
  }

  return drafts.slice(0, count).map((d) => {
    const s = scoreHook(d.hook, client.area);
    return { ...d, ...s };
  });
}

/* ── Gemini ────────────────────────────────────────────────────── */
async function callGemini(prompt: string, system: string): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.95,
            responseMimeType: "application/json",
            maxOutputTokens: 1600,
          },
        }),
        signal: AbortSignal.timeout(25_000),
      }
    );
    if (!res.ok) {
      console.error("[gemini]", res.status, (await res.text()).slice(0, 300));
      return null;
    }
    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    return json.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch (err) {
    console.error("[gemini]", err);
    return null;
  }
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function generateConcepts(
  client: ClientInput,
  brief: string,
  count = 4
): Promise<{ concepts: Concept[]; engine: "gemini" | "playbook" }> {
  const pb = playbookFor(client.niche);
  const proof = client.proof?.trim() || "an owner-verified fact (never invent a count)";
  const offers = client.offers
    .map((o) => `- ${o.title}${o.price ? ` (${o.price})` : ""}: ${o.description}`)
    .join("\n");

  const system = `You are a senior performance-marketing copywriter in Kanpur, India.
You write Meta/TikTok ad scripts in natural Hinglish (Roman script, never Devanagari).
Rules:
- Hooks must be under 42 characters and feel like something a local shopkeeper would actually say.
- Never invent medical, financial or guaranteed results. No "100% cure", no fake discounts.
- Never invent patient counts, customer counts or years in business. Use only the proof supplied.
- Use the exact offer and price supplied. Do not invent offers.
- Scenes: exactly 3 — Hook, Offer, CTA. Each has "text" (on-screen, max 42 chars) and "sub" (support line, max 70 chars).
- Return ONLY JSON.`;

  const prompt = `Client: ${client.name}
Niche: ${client.niche}
Area: ${client.area}, ${client.city}
Phone: ${client.phone}
Offers:
${offers}
${client.notes ? `Agency notes: ${client.notes}` : ""}
${brief ? `Campaign brief: ${brief}` : ""}

Write ${count} distinct ad concepts using different angles: problem-first, price-led, social proof (use only: ${proof}), urgency (use: ${pb.urgency}).
Return JSON exactly like:
{"concepts":[{"angle":"Problem-first","title":"short internal name","hook":"on-screen hook","cta":"CTA in Hinglish","platform":"META","rationale":"one sentence on why this should work for this specific business","scenes":[{"label":"Hook","text":"...","sub":"..."},{"label":"Offer","text":"...","sub":"..."},{"label":"CTA","text":"...","sub":"..."}]}]}`;

  const raw = await callGemini(prompt, system);
  const parsed = parseJson<{ concepts?: Partial<Concept>[] }>(raw);

  if (!parsed?.concepts?.length) {
    return { concepts: fallbackConcepts(client, brief, count), engine: "playbook" };
  }

  const concepts: Concept[] = parsed.concepts.slice(0, count).map((c, i) => {
    const hook = String(c.hook || c.scenes?.[0]?.text || "").slice(0, 60);
    const scenes = (c.scenes ?? []).slice(0, 3).map((s, idx) => ({
      label: s.label || ["Hook", "Offer", "CTA"][idx] || "Scene",
      text: String(s.text || ""),
      sub: String(s.sub || ""),
    }));
    while (scenes.length < 3) {
      scenes.push({ label: ["Hook", "Offer", "CTA"][scenes.length], text: hook, sub: "" });
    }
    const scored = scoreHook(hook, client.area);
    return {
      angle: c.angle || `Angle ${i + 1}`,
      title: c.title || `${client.niche} concept ${i + 1}`,
      hook,
      scenes,
      cta: c.cta || pb.cta,
      platform: c.platform === "TIKTOK" ? "TIKTOK" : "META",
      rationale: c.rationale || "Angle selected by Gemini from the client's offer set.",
      ...scored,
    };
  });

  if (!concepts.length) {
    return { concepts: fallbackConcepts(client, brief, count), engine: "playbook" };
  }
  return { concepts, engine: "gemini" };
}

/* ── Reviews ───────────────────────────────────────────────────── */
const REVIEW_SYSTEM = `You write Google reviews for real customers in Kanpur, India.
Rules: 3 sentences, natural Hinglish in Roman script, 45-70 words, mention the area once.
Sound like a normal person, not a marketer. No emoji. No exclamation marks. No invented medical outcomes.
Return ONLY JSON: {"text":"..."}`;

export async function generateReview(args: {
  client: ClientInput;
  customer: string;
  tags: string[];
}): Promise<{ text: string; engine: "gemini" | "template" }> {
  const { client, customer, tags } = args;

  const raw = await callGemini(
    `Business: ${client.name} (${client.niche}) in ${client.area}, ${client.city}.
Customer name: ${customer}
What they liked: ${tags.join(", ")}
Write the review.`,
    REVIEW_SYSTEM
  );
  const parsed = parseJson<{ text?: string }>(raw);
  if (parsed?.text && parsed.text.length > 40) {
    return { text: parsed.text.trim(), engine: "gemini" };
  }

  const tagLine = tags.slice(0, 2).join(" aur ").toLowerCase();
  const text = `${client.area} mein ${client.name} ka experience bahut accha raha. ${tagLine ? `${tagLine} — dono cheezein genuinely notice hui.` : "Staff ne poora time diya."} Kaam time pe hua aur billing mein koi hidden charge nahi tha, isliye family ko bhi yahi suggest karunga.`;

  return { text, engine: "template" };
}
