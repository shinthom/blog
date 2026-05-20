"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { siteConfig } from "@/site.config";

const MarkdownView = dynamic(() => import("@/components/MarkdownView"), {
  ssr: false,
});

type Mode = "split" | "edit" | "preview";

export type EditorInitial = {
  id?: string;
  title: string;
  slug: string;
  category: string | null;
  excerpt: string;
  content: string;
};

type SaveState = "idle" | "saving" | "saved" | "error";

function deriveSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || `post-${Date.now()}`
  );
}

export default function Editor({ initial }: { initial: EditorInitial }) {
  const router = useRouter();
  const [id, setId] = useState<string | undefined>(initial.id);
  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.slug));
  const [category, setCategory] = useState<string>(initial.category ?? "");
  const [excerpt, setExcerpt] = useState(initial.excerpt);
  const [content, setContent] = useState(initial.content);
  const [mode, setMode] = useState<Mode>("split");
  const [save, setSave] = useState<SaveState>("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!slugTouched) setSlug(deriveSlug(title));
  }, [title, slugTouched]);

  const buildPayload = useCallback(
    () => ({
      title: title.trim() || "Untitled",
      slug: slug.trim() || deriveSlug(title || "untitled"),
      category: category || null,
      excerpt: excerpt.trim() || null,
      content,
    }),
    [title, slug, category, excerpt, content],
  );

  const persist = useCallback(
    async (redirect?: string) => {
      setSave("saving");
      setErrMsg(null);
      try {
        const payload = buildPayload();
        const res = id
          ? await fetch(`/api/drafts/${id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await fetch("/api/drafts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Save failed (${res.status})`);
        }
        const data = (await res.json()) as { id: string };
        if (!id) setId(data.id);
        setSave("saved");
        if (redirect) router.push(redirect);
        else setTimeout(() => setSave("idle"), 1500);
        return data.id;
      } catch (e) {
        setSave("error");
        setErrMsg(e instanceof Error ? e.message : "Unknown error");
        return null;
      }
    },
    [buildPayload, id, router],
  );

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = Array.from(e.clipboardData?.items ?? []);
      const file = items
        .map((it) => (it.kind === "file" ? it.getAsFile() : null))
        .find((f): f is File => !!f && f.type.startsWith("image/"));
      if (!file) return;

      e.preventDefault();
      const ta = textareaRef.current!;
      const placeholder = `![uploading...](uploading)`;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const before = content.slice(0, start);
      const after = content.slice(end);
      const next = `${before}${placeholder}${after}`;
      setContent(next);
      // restore caret position after placeholder
      requestAnimationFrame(() => {
        ta.focus();
        const pos = start + placeholder.length;
        ta.setSelectionRange(pos, pos);
      });

      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: form });
        if (!res.ok) throw new Error(`upload failed (${res.status})`);
        const { url } = (await res.json()) as { url: string };
        setContent((curr) =>
          curr.replace(placeholder, `![](${url})`),
        );
      } catch (err) {
        setContent((curr) =>
          curr.replace(placeholder, `<!-- image upload failed -->`),
        );
        setErrMsg(err instanceof Error ? err.message : "Upload failed");
      }
    },
    [content],
  );

  // Ctrl/Cmd+S to save
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        void persist();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [persist]);

  const categoryOptions = useMemo(() => siteConfig.categories, []);

  return (
    <div className="editor">
      <div className="editor-meta">
        <input
          className="editor-title"
          placeholder="Post title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="editor-meta-row">
          <label>
            <span>Slug</span>
            <input
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
              }}
            />
          </label>
          <label>
            <span>Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">— none —</option>
              {categoryOptions.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grow">
            <span>Excerpt</span>
            <input
              placeholder="One-line summary (optional)"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="editor-toolbar">
        <div className="seg">
          <button
            type="button"
            className={mode === "edit" ? "active" : ""}
            onClick={() => setMode("edit")}
          >
            Edit
          </button>
          <button
            type="button"
            className={mode === "split" ? "active" : ""}
            onClick={() => setMode("split")}
          >
            Split
          </button>
          <button
            type="button"
            className={mode === "preview" ? "active" : ""}
            onClick={() => setMode("preview")}
          >
            Preview
          </button>
        </div>
        <div className="spacer" />
        <span className="save-state" data-state={save}>
          {save === "saving" && "Saving…"}
          {save === "saved" && "Saved"}
          {save === "error" && `Error: ${errMsg}`}
          {save === "idle" && (id ? "Draft" : "New draft")}
        </span>
        <button
          type="button"
          className="btn"
          onClick={() => void persist()}
          disabled={save === "saving"}
        >
          Save
        </button>
        <button
          type="button"
          className="btn primary"
          onClick={() => void persist("/draft")}
          disabled={save === "saving"}
        >
          Finish
        </button>
      </div>

      <div className={`editor-panes mode-${mode}`}>
        {mode !== "preview" && (
          <textarea
            ref={textareaRef}
            className="editor-textarea"
            placeholder="# Start writing in Markdown…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onPaste={handlePaste}
            spellCheck={false}
          />
        )}
        {mode !== "edit" && (
          <div className="editor-preview markdown-body">
            <MarkdownView source={content || "*Nothing to preview yet.*"} />
          </div>
        )}
      </div>
    </div>
  );
}
