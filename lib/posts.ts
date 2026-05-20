import { getReadClient } from "@/lib/supabase";
import { dbOne, dbQuery } from "@/lib/db";
import { siteConfig, type CategorySlug } from "@/site.config";

export type PostStatus = "draft" | "published";

export type PostRow = {
  id: string;
  slug: string;
  title: string;
  content: string;
  category: CategorySlug | null;
  excerpt: string | null;
  status: PostStatus;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

export type PostSummary = {
  id: string;
  slug: string;
  title: string;
  category: CategorySlug | null;
  excerpt: string | null;
  date: string;
  href: string;
};

const validCategories = new Set<string>(
  siteConfig.categories.map((c) => c.slug),
);

function rowToSummary(row: PostRow): PostSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category:
      row.category && validCategories.has(row.category)
        ? (row.category as CategorySlug)
        : null,
    excerpt: row.excerpt,
    date: row.published_at ?? row.created_at,
    href: `/posts/${row.slug}`,
  };
}

// ---------- Public reads (Supabase REST, publishable key, RLS-bound) ----------

export async function listPublishedPosts(): Promise<PostSummary[]> {
  const client = getReadClient();
  if (!client) return [];
  const { data, error } = await client
    .from("posts")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (error) {
    console.error("listPublishedPosts:", error.message);
    return [];
  }
  return (data as PostRow[]).map(rowToSummary);
}

export async function listPublishedByCategory(
  category: CategorySlug,
): Promise<PostSummary[]> {
  const client = getReadClient();
  if (!client) return [];
  const { data, error } = await client
    .from("posts")
    .select("*")
    .eq("status", "published")
    .eq("category", category)
    .order("published_at", { ascending: false });
  if (error) {
    console.error("listPublishedByCategory:", error.message);
    return [];
  }
  return (data as PostRow[]).map(rowToSummary);
}

export async function getPublishedPostBySlug(
  slug: string,
): Promise<PostRow | null> {
  const client = getReadClient();
  if (!client) return null;
  const { data, error } = await client
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) {
    console.error("getPublishedPostBySlug:", error.message);
    return null;
  }
  return (data as PostRow | null) ?? null;
}

// ---------- Admin (direct Postgres) ----------

export async function listDrafts(): Promise<PostRow[]> {
  return dbQuery<PostRow>(
    `select * from public.posts
     where status = 'draft'
     order by updated_at desc`,
  );
}

export async function getDraftById(id: string): Promise<PostRow | null> {
  return dbOne<PostRow>(
    `select * from public.posts where id = $1 and status = 'draft'`,
    [id],
  );
}

export async function getPostById(id: string): Promise<PostRow | null> {
  return dbOne<PostRow>(`select * from public.posts where id = $1`, [id]);
}

export async function isSlugTaken(
  slug: string,
  excludeId?: string,
): Promise<boolean> {
  const row = await dbOne<{ id: string }>(
    excludeId
      ? `select id from public.posts where slug = $1 and id <> $2`
      : `select id from public.posts where slug = $1`,
    excludeId ? [slug, excludeId] : [slug],
  );
  return Boolean(row);
}

export async function createDraft(input: {
  slug: string;
  title: string;
  content: string;
  category: string | null;
  excerpt: string | null;
}): Promise<{ id: string; slug: string }> {
  const row = await dbOne<{ id: string; slug: string }>(
    `insert into public.posts
       (slug, title, content, category, excerpt, status)
     values ($1, $2, $3, $4, $5, 'draft')
     returning id, slug`,
    [
      input.slug,
      input.title,
      input.content,
      input.category,
      input.excerpt,
    ],
  );
  if (!row) throw new Error("insert returned no row");
  return row;
}

export async function updateDraftRow(
  id: string,
  patch: {
    slug?: string;
    title?: string;
    content?: string;
    category?: string | null;
    excerpt?: string | null;
  },
): Promise<{ id: string; slug: string }> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  for (const key of [
    "slug",
    "title",
    "content",
    "category",
    "excerpt",
  ] as const) {
    if (patch[key] !== undefined) {
      sets.push(`${key} = $${i++}`);
      params.push(patch[key]);
    }
  }

  if (sets.length === 0) {
    const existing = await dbOne<{ id: string; slug: string }>(
      `select id, slug from public.posts where id = $1`,
      [id],
    );
    if (!existing) throw new Error("not found");
    return existing;
  }

  params.push(id);
  const row = await dbOne<{ id: string; slug: string }>(
    `update public.posts set ${sets.join(", ")} where id = $${i} returning id, slug`,
    params,
  );
  if (!row) throw new Error("not found");
  return row;
}

export async function deleteDraft(id: string): Promise<void> {
  await dbQuery(`delete from public.posts where id = $1`, [id]);
}

export async function publishDraft(
  id: string,
  category: string,
): Promise<{ id: string; slug: string }> {
  const row = await dbOne<{ id: string; slug: string }>(
    `update public.posts
        set status = 'published',
            category = $1,
            published_at = now()
      where id = $2 and status = 'draft'
      returning id, slug`,
    [category, id],
  );
  if (!row) throw new Error("not found or already published");
  return row;
}

// ---------- Utilities ----------

export function formatPostDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${d.getUTCFullYear()} ${months[d.getUTCMonth()]} ${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
}

// Only ASCII letters/digits + hyphens are allowed in slugs.
// Anything else (including Hangul, CJK, accented chars) is stripped.
export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || `post-${Date.now()}`
  );
}

// Returns true if the string only contains characters allowed in a final slug.
export function isValidSlug(s: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s);
}
