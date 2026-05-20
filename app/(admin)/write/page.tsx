import Editor, { type EditorInitial } from "@/components/Editor";
import { getPostById } from "@/lib/posts";

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
    // Accept either a draft or an already-published post — editing in place
    // is allowed from admin IPs.
    const post = await getPostById(id);
    if (post) {
      initial = {
        id: post.id,
        title: post.title,
        slug: post.slug,
        category: post.category,
        excerpt: post.excerpt ?? "",
        content: post.content,
      };
    }
  }

  return <Editor initial={initial} />;
}
