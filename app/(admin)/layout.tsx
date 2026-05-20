import Link from "next/link";
import { siteConfig } from "@/site.config";

export const metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-shell">
      <header className="admin-header">
        <Link href="/" className="admin-brand">
          {siteConfig.title}
        </Link>
        <nav className="admin-nav">
          <Link href="/write">Write</Link>
          <Link href="/draft">Drafts</Link>
        </nav>
      </header>
      <main className="admin-main">{children}</main>
    </div>
  );
}
