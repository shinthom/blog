import Editor, { type EditorInitial } from "@/components/Editor";
import { getDraftById } from "@/lib/posts";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Write",
  robots: { index: false, follow: false },
};

export default async function WritePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  let initial: EditorInitial = {
    title: "",
    slug: "",
    category: null,
    excerpt: "",
    content: "",
  };

  if (id) {
    const draft = await getDraftById(id);
    if (draft) {
      initial = {
        id: draft.id,
        title: draft.title,
        slug: draft.slug,
        category: draft.category,
        excerpt: draft.excerpt ?? "",
        content: draft.content,
      };
    }
  }

  return <Editor initial={initial} />;
}
