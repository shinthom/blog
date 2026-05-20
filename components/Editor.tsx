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
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || `post-${Date.now()}`
  );
}

const VALID_SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

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
  const previewRef = useRef<HTMLDivElement | null>(null);
  const syncingRef = useRef<"edit" | "preview" | null>(null);

  const ratio = (el: HTMLElement) => {
    const max = el.scrollHeight - el.clientHeight;
    if (max <= 0) return 0;
    return el.scrollTop / max;
  };
  const applyRatio = (el: HTMLElement, r: number) => {
    const max = el.scrollHeight - el.clientHeight;
    el.scrollTop = Math.max(0, Math.min(max, r * max));
  };

  const onEditScroll = useCallback(() => {
    if (mode !== "split") return;
    if (syncingRef.current === "preview") {
      syncingRef.current = null;
      return;
    }
    const ed = textareaRef.current;
    const pv = previewRef.current;
    if (!ed || !pv) return;
    syncingRef.current = "edit";
    applyRatio(pv, ratio(ed));
  }, [mode]);

  const onPreviewScroll = useCallback(() => {
    if (mode !== "split") return;
    if (syncingRef.current === "edit") {
      syncingRef.current = null;
      return;
    }
    const ed = textareaRef.current;
    const pv = previewRef.current;
    if (!ed || !pv) return;
    syncingRef.current = "preview";
    applyRatio(ed, ratio(pv));
  }, [mode]);

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

  // Wraps the current textarea selection in `marker` on both sides, or
  // toggles it off if the selection is already surrounded by `marker`.
  // With no selection, inserts the markers and places the caret between them.
  const wrapSelection = useCallback((marker: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;

    setContent((curr) => {
      const before = curr.slice(0, start);
      const selected = curr.slice(start, end);
      const after = curr.slice(end);

      const wrappedAround =
        before.endsWith(marker) && after.startsWith(marker);
      // Also handle the case where the user selected ALONG WITH the markers,
      // e.g. "**bold**" — strip them in that case too.
      const wrappedInside =
        selected.startsWith(marker) &&
        selected.endsWith(marker) &&
        selected.length >= marker.length * 2;

      let next: string;
      let newStart: number;
      let newEnd: number;

      if (wrappedAround) {
        next = before.slice(0, -marker.length) + selected + after.slice(marker.length);
        newStart = start - marker.length;
        newEnd = end - marker.length;
      } else if (wrappedInside) {
        const inner = selected.slice(marker.length, -marker.length);
        next = before + inner + after;
        newStart = start;
        newEnd = end - marker.length * 2;
      } else {
        next = before + marker + selected + marker + after;
        newStart = start + marker.length;
        newEnd = end + marker.length;
      }

      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(newStart, newEnd);
      });
      return next;
    });
  }, []);

  const handleEditorKey = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "b") {
        e.preventDefault();
        wrapSelection("**");
      } else if (k === "i") {
        e.preventDefault();
        wrapSelection("*");
      }
    },
    [wrapSelection],
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
              aria-invalid={slug !== "" && !VALID_SLUG_RE.test(slug)}
            />
            {slug !== "" && !VALID_SLUG_RE.test(slug) ? (
              <em
                style={{
                  color: "#c0392b",
                  fontSize: "0.72rem",
                  marginTop: 2,
                  fontStyle: "normal",
                }}
              >
                Use lowercase a–z, 0–9, and hyphens only.
              </em>
            ) : null}
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
            onKeyDown={handleEditorKey}
            onScroll={onEditScroll}
            spellCheck={false}
          />
        )}
        {mode !== "edit" && (
          <div
            className="editor-preview"
            ref={previewRef}
            onScroll={onPreviewScroll}
          >
            <div className="markdown-body editor-preview-inner">
              <h1>{title || "Untitled"}</h1>
              <small>
                {(() => {
                  const d = new Date();
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
                })()}
                {category
                  ? ` · ${
                      siteConfig.categories.find((c) => c.slug === category)
                        ?.label ?? category
                    }`
                  : ""}
              </small>
              <div style={{ marginTop: "1.5em" }}>
                <MarkdownView
                  source={content || "*Nothing to preview yet.*"}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
