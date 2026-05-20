import { NextResponse } from "next/server";
import {
  createDraft,
  isSlugTaken,
  slugify,
} from "@/lib/posts";
import { siteConfig } from "@/site.config";

const validCategories = new Set<string>(
  siteConfig.categories.map((c) => c.slug),
);

async function uniqueSlug(base: string): Promise<string> {
  let candidate = base;
  for (let i = 0; i < 50; i++) {
    if (!(await isSlugTaken(candidate))) return candidate;
    candidate = `${base}-${i + 2}`;
  }
  return `${base}-${Date.now()}`;
}

export async function POST(req: Request) {
  let body: {
    title?: string;
    slug?: string;
    category?: string | null;
    excerpt?: string | null;
    content?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const title = (body.title ?? "").trim() || "Untitled";
  const baseSlug = slugify(body.slug?.trim() || title);
  const slug = await uniqueSlug(baseSlug);
  const category =
    body.category && validCategories.has(body.category) ? body.category : null;

  try {
    const row = await createDraft({
      slug,
      title,
      content: body.content ?? "",
      category,
      excerpt: body.excerpt?.trim() || null,
    });
    return NextResponse.json(row);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "create failed" },
      { status: 500 },
    );
  }
}
