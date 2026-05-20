import Link from "next/link";
import DraftRow from "@/components/DraftRow";
import { listDrafts } from "@/lib/posts";
import { supabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Drafts",
  robots: { index: false, follow: false },
};

export default async function DraftsPage() {
  if (!supabaseConfigured) {
    return (
      <div className="admin-empty">
        <h2>Supabase is not configured</h2>
        <p>
          Set <code>NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, and{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code> in <code>.env.local</code> and
          restart the dev server.
        </p>
      </div>
    );
  }

  let drafts;
  try {
    drafts = await listDrafts();
  } catch (e) {
    return (
      <div className="admin-empty">
        <h2>Couldn't load drafts</h2>
        <p>{e instanceof Error ? e.message : "Unknown error"}</p>
      </div>
    );
  }

  return (
    <div className="drafts">
      <header className="drafts-header">
        <h1>Drafts</h1>
        <Link className="btn primary" href="/write">
          New draft
        </Link>
      </header>

      {drafts.length === 0 ? (
        <p className="drafts-empty">
          No drafts yet. <Link href="/write">Start writing →</Link>
        </p>
      ) : (
        <ul className="draft-list">
          {drafts.map((d) => (
            <DraftRow key={d.id} draft={d} />
          ))}
        </ul>
      )}
    </div>
  );
}
