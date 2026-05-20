import { NextResponse } from "next/server";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB (Cloudflare Images cap)

const TOKEN = process.env.CLOUDFLARE_IMAGES_TOKEN;
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const HASH = process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_HASH;
const VARIANT = process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_VARIANT ?? "public";

export async function POST(req: Request) {
  if (!TOKEN || !ACCOUNT_ID || !HASH) {
    return NextResponse.json(
      {
        error:
          "Cloudflare Images is not fully configured. Need CLOUDFLARE_IMAGES_TOKEN, CLOUDFLARE_ACCOUNT_ID, and NEXT_PUBLIC_CLOUDFLARE_IMAGES_HASH.",
      },
      { status: 500 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file missing" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "only image uploads are supported" },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "file too large" }, { status: 413 });
  }

  // Cloudflare Images expects multipart/form-data with the field name `file`.
  const cfForm = new FormData();
  cfForm.append("file", file, file.name);

  let res: Response;
  try {
    res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/images/v1`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${TOKEN}` },
        body: cfForm,
      },
    );
  } catch (e) {
    return NextResponse.json(
      {
        error: `network error talking to Cloudflare: ${e instanceof Error ? e.message : String(e)}`,
      },
      { status: 502 },
    );
  }

  const json = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    result?: { id?: string; variants?: string[] };
    errors?: Array<{ code: number; message: string }>;
  };

  if (!res.ok || !json.success || !json.result?.id) {
    const message =
      json.errors?.map((e) => `${e.code}: ${e.message}`).join("; ") ??
      `Cloudflare returned ${res.status}`;
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const id = json.result.id;
  // Prefer the matching variant from the API response; fall back to building
  // the canonical imagedelivery.net URL from the env hash.
  const direct = json.result.variants?.find((v) =>
    v.endsWith(`/${VARIANT}`),
  );
  const url = direct ?? `https://imagedelivery.net/${HASH}/${id}/${VARIANT}`;

  return NextResponse.json({ id, url });
}
