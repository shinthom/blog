"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { siteConfig } from "@/site.config";
import type { PostRow } from "@/lib/posts";

export default function DraftRow({ draft }: { draft: PostRow }) {
  const router = useRouter();
  const [category, setCategory] = useState<string>(draft.category ?? "");
  const [busy, setBusy] = useState<"publish" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updatedAt = new Date(draft.updated_at).toLocaleString();

  async function handlePublish() {
    if (!category) {
      setError("Please pick a category before publishing.");
      return;
    }
    setBusy("publish");
    setError(null);
    try {
      const res = await fetch(`/api/drafts/${draft.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Publish failed (${res.status})`);
      }
      const data = (await res.json()) as { slug: string };
      router.push(`/posts/${data.slug}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setBusy(null);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete draft "${draft.title || "Untitled"}"?`)) return;
    setBusy("delete");
    setError(null);
    try {
      const res = await fetch(`/api/drafts/${draft.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Delete failed (${res.status})`);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setBusy(null);
    }
  }

  return (
    <li className="draft-row">
      <div className="draft-row-main">
        <Link className="draft-title" href={`/write?id=${draft.id}`}>
          {draft.title || "Untitled"}
        </Link>
        <div className="draft-meta">
          <span>updated {updatedAt}</span>
          {draft.excerpt ? <span>— {draft.excerpt}</span> : null}
        </div>
      </div>
      <div className="draft-row-actions">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Category"
        >
          <option value="">Choose tag…</option>
          {siteConfig.categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.label}
            </option>
          ))}
        </select>
        <Link className="btn" href={`/write?id=${draft.id}`}>
          Edit
        </Link>
        <button
          type="button"
          className="btn primary"
          onClick={handlePublish}
          disabled={busy !== null}
        >
          {busy === "publish" ? "Publishing…" : "Publish"}
        </button>
        <button
          type="button"
          className="btn danger"
          onClick={handleDelete}
          disabled={busy !== null}
        >
          {busy === "delete" ? "Deleting…" : "Delete"}
        </button>
      </div>
      {error ? <div className="draft-error">{error}</div> : null}
    </li>
  );
}
