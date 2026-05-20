import { headers } from "next/headers";

function parseAllowList(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalize(ip: string): string {
  // Strip IPv4-mapped IPv6 prefix.
  if (ip.startsWith("::ffff:")) return ip.slice(7);
  return ip;
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const v = Number(p);
    if (!Number.isInteger(v) || v < 0 || v > 255) return null;
    n = (n << 8) | v;
  }
  return n >>> 0;
}

function ipv4InCidr(ip: string, cidr: string): boolean {
  const [base, bitsStr] = cidr.split("/");
  const bits = Number(bitsStr ?? 32);
  if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false;
  const ipInt = ipv4ToInt(ip);
  const baseInt = ipv4ToInt(base);
  if (ipInt === null || baseInt === null) return false;
  if (bits === 0) return true;
  const mask = (0xffffffff << (32 - bits)) >>> 0;
  return (ipInt & mask) === (baseInt & mask);
}

function matches(ip: string, rule: string): boolean {
  const target = normalize(ip);
  if (rule === target) return true;
  if (rule.includes("/")) return ipv4InCidr(target, rule);
  return false;
}

async function clientIp(): Promise<string | null> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const real = h.get("x-real-ip");
  if (real) return real.trim();
  const cf = h.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const vercel = h.get("x-vercel-forwarded-for");
  if (vercel) return vercel.split(",")[0]!.trim();
  return null;
}

export async function isAdminVisitor(): Promise<boolean> {
  const rules = parseAllowList(process.env.ADMIN_ALLOW_IPS);
  if (rules.length === 0) return false;
  const ip = await clientIp();
  if (!ip) return false;
  return rules.some((rule) => matches(ip, rule));
}

export { clientIp };
