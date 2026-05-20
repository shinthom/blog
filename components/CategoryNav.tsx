import Link from "next/link";
import { siteConfig } from "@/site.config";

export default function CategoryNav() {
  return (
    <div style={{ textAlign: "center" }}>
      <hr />
      {siteConfig.categories.map((cat) => (
        <span
          key={cat.slug}
          className="toc-category"
          style={{ fontSize: cat.fontSize }}
        >
          <Link href={`/categories/${cat.slug}`}>{cat.label}</Link>
        </span>
      ))}
      <hr />
    </div>
  );
}
