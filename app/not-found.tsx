import Link from "next/link";

export const metadata = {
  title: "Not found",
};

export default function NotFound() {
  return (
    <div className="container-fluid markdown-body" style={{ textAlign: "center" }}>
      <h1 style={{ borderBottom: 0, marginTop: "20vh" }}>404</h1>
      <p style={{ marginTop: "1em" }}>
        The page you're looking for doesn't exist.
      </p>
      <p>
        <Link href="/">&larr; Home</Link>
      </p>
    </div>
  );
}
