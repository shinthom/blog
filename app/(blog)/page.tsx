import Link from "next/link";
import CategoryNav from "@/components/CategoryNav";
import PostList from "@/components/PostList";
import { listPublishedPosts } from "@/lib/posts";
import { siteConfig } from "@/site.config";

export const revalidate = 30;

export default async function Home() {
  const posts = await listPublishedPosts();
  return (
    <>
      <br />
      <h1 style={{ borderBottom: 0, textAlign: "center" }}>
        <Link href="/" className="site-title-link">
          {siteConfig.title}
        </Link>
      </h1>
      <CategoryNav />
      <br />
      <PostList posts={posts} />
    </>
  );
}
