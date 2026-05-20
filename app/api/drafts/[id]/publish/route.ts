import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getPostById, publishDraft } from "@/lib/posts";
import { siteConfig } from "@/site.config";

const validCategories = new Set<string>(
  siteConfig.categories.map((c) => c.slug),
);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: { category?: string } = {};
  try {
    body = await req.json();
  } catch {
    // body is optional
  }

  const existing = await getPostById(id);
  if (!existing) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (existing.status === "published") {
    return NextResponse.json(
      { error: "post is already published" },
      { status: 409 },
    );
  }

  const nextCategory =
    body.category && validCategories.has(body.category)
      ? body.category
      : existing.category;
  if (!nextCategory || !validCategories.has(nextCategory)) {
    return NextResponse.json(
      { error: "a valid category is required to publish" },
      { status: 400 },
    );
  }

  try {
    const row = await publishDraft(id, nextCategory);
    revalidatePath("/");
    revalidatePath(`/posts/${row.slug}`);
    revalidatePath(`/categories/${nextCategory}`);
    revalidatePath("/feed.xml");
    return NextResponse.json(row);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "publish failed" },
      { status: 500 },
    );
  }
}
