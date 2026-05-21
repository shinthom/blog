"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PostAdminActions({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/drafts/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `delete failed (${res.status})`);
      }
      router.push("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "delete failed");
      setBusy(false);
    }
  }

  return (
    <span className="post-admin-actions" style={{ fontSize: "0.85rem" }}>
      <Link href={`/write?id=${id}`}>Edit</Link>
      <span aria-hidden="true" style={{ opacity: 0.45, margin: "0 6px" }}>
        ·
      </span>
      <button
        type="button"
        onClick={handleDelete}
        disabled={busy}
        className="post-admin-delete"
        aria-label={`Delete "${title}"`}
      >
        {busy ? "Deleting…" : "Delete"}
      </button>
      {error ? (
        <span style={{ color: "#c0392b", marginLeft: 8 }}>{error}</span>
      ) : null}
    </span>
  );
}
