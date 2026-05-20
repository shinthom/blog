import Link from "next/link";
import { isAdminVisitor } from "@/lib/admin-ip";

export default async function AdminMenu() {
  if (!(await isAdminVisitor())) return null;
  return (
    <div className="admin-menu" aria-label="Admin shortcuts">
      <Link href="/write">Write</Link>
      <span aria-hidden="true">·</span>
      <Link href="/draft">Drafts</Link>
    </div>
  );
}
