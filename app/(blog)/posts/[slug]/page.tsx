import Link from "next/link";
import { notFound } from "next/navigation";
import MarkdownView from "@/components/MarkdownView";
import {
  formatPostDate,
  getPublishedPostBySlug,
} from "@/lib/posts";
import { siteConfig } from "@/site.config";

export const revalidate = 30;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) return {};
  return {
    title: `${post.title} | ${siteConfig.title}`,
    description: post.excerpt ?? siteConfig.description,
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) notFound();

  const category = siteConfig.categories.find((c) => c.slug === post.category);

  return (
    <article>
      <p style={{ marginTop: "1em" }}>
        <Link href="/">&larr; Home</Link>
      </p>
      <h1>{post.title}</h1>
      <small>
        {formatPostDate(post.published_at ?? post.created_at)}
        {category ? (
          <>
            {" · "}
            <Link href={`/categories/${category.slug}`}>{category.label}</Link>
          </>
        ) : null}
      </small>
      <div style={{ marginTop: "1.5em" }}>
        <MarkdownView source={post.content} />
      </div>
    </article>
  );
}
