import { notFound } from "next/navigation";
import CategoryNav from "@/components/CategoryNav";
import PostList from "@/components/PostList";
import { listPublishedByCategory } from "@/lib/posts";
import { siteConfig, type CategorySlug } from "@/site.config";

export const revalidate = 30;

export function generateStaticParams() {
  return siteConfig.categories.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const cat = siteConfig.categories.find((c) => c.slug === category);
  if (!cat) return {};
  return {
    title: `${cat.label} | ${siteConfig.title}`,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const cat = siteConfig.categories.find((c) => c.slug === category);
  if (!cat) notFound();

  const posts = await listPublishedByCategory(cat.slug as CategorySlug);

  return (
    <>
      <br />
      <h1 style={{ borderBottom: 0, textAlign: "center" }}>{cat.label}</h1>
      <CategoryNav />
      <br />
      <PostList posts={posts} />
    </>
  );
}
