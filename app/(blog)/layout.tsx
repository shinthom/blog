import AdminMenu from "@/components/AdminMenu";

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div id="doc" className="container-fluid markdown-body">
      <AdminMenu />
      {children}
    </div>
  );
}
