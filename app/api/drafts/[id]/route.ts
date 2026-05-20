import { NextResponse } from "next/server";
import {
  deleteDraft,
  getPostById,
  isSlugTaken,
  slugify,
  updateDraftRow,
} from "@/lib/posts";
import { siteConfig } from "@/site.config";

const validCategories = new Set<string>(
  siteConfig.categories.map((c) => c.slug),
);

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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

  const existing = await getPostById(id);
  if (!existing) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const patch: Parameters<typeof updateDraftRow>[1] = {};

  if (body.title !== undefined) patch.title = body.title.trim() || "Untitled";
  if (body.content !== undefined) patch.content = body.content;
  if (body.excerpt !== undefined) patch.excerpt = body.excerpt?.trim() || null;
  if (body.category !== undefined) {
    patch.category =
      body.category && validCategories.has(body.category)
        ? body.category
        : null;
  }
  if (body.slug !== undefined && body.slug.trim()) {
    const candidate = slugify(body.slug.trim());
    if (candidate !== existing.slug) {
      if (await isSlugTaken(candidate, id)) {
        return NextResponse.json(
          { error: `slug "${candidate}" is already taken` },
          { status: 409 },
        );
      }
      patch.slug = candidate;
    }
  }

  try {
    const row = await updateDraftRow(id, patch);
    return NextResponse.json(row);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "update failed" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    await deleteDraft(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "delete failed" },
      { status: 500 },
    );
  }
}
