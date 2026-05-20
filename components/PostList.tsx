import Link from "next/link";
import { formatPostDate, type PostSummary } from "@/lib/posts";

export default function PostList({ posts }: { posts: PostSummary[] }) {
  if (posts.length === 0) {
    return (
      <p style={{ textAlign: "center", opacity: 0.7, marginTop: "2em" }}>
        No posts yet.
      </p>
    );
  }
  return (
    <ul className="post-list" style={{ paddingLeft: 0 }}>
      {posts.map((post) => (
        <li key={post.slug}>
          <span className="post-meta">{formatPostDate(post.date)}</span>
          <h3 style={{ marginTop: "12px" }}>
            <Link className="post-link" href={post.href}>
              {post.title}
            </Link>
          </h3>
        </li>
      ))}
    </ul>
  );
}
