export const inr = (n: number, compact = false) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
    notation: compact ? "compact" : "standard",
  }).format(n);

export const num = (n: number, compact = false) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 1,
    notation: compact ? "compact" : "standard",
  }).format(n);

export const pct = (n: number, digits = 1) => `${n.toFixed(digits)}%`;

export const dateShort = (d: Date | string) =>
  new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(new Date(d));

export const dateTime = (d: Date | string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(d));

export function timeAgo(d: Date | string) {
  const ms = Date.now() - new Date(d).getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.round(days / 30)}mo ago`;
}

export function waLink(phone: string, text: string) {
  const digits = phone.replace(/\D/g, "");
  const withCode = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${withCode}?text=${encodeURIComponent(text)}`;
}

export const scoreTone = (score: number) =>
  score >= 85 ? "text-mint" : score >= 70 ? "text-lime" : score >= 55 ? "text-amber" : "text-rose";
