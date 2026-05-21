import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  deleteDraft,
  getPostById,
  isSlugTaken,
  isValidSlug,
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
    const raw = body.slug.trim();
    if (!isValidSlug(raw)) {
      return NextResponse.json(
        {
          error:
            "Slug must contain only lowercase ASCII letters, digits, and hyphens (no Hangul or other Unicode).",
        },
        { status: 400 },
      );
    }
    const candidate = slugify(raw);
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
    // If the post is already published, the change should reach the public
    // pages right away (we leave status as-is — the editor saves drafts and
    // edits-in-place; status only flips via /publish).
    if (existing.status === "published") {
      revalidatePath("/");
      revalidatePath(`/posts/${row.slug}`);
      if (row.slug !== existing.slug) revalidatePath(`/posts/${existing.slug}`);
      if (existing.category) revalidatePath(`/categories/${existing.category}`);
      revalidatePath("/feed.xml");
    }
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
    // Look the post up first so that if it was already published we know
    // which public routes need a cache bust after deletion.
    const existing = await getPostById(id);
    await deleteDraft(id);
    if (existing?.status === "published") {
      revalidatePath("/");
      revalidatePath(`/posts/${existing.slug}`);
      if (existing.category)
        revalidatePath(`/categories/${existing.category}`);
      revalidatePath("/feed.xml");
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "delete failed" },
      { status: 500 },
    );
  }
}
