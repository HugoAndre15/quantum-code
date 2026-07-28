import { del, put } from "@vercel/blob";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

async function isAdmin(request: NextRequest) {
  const backend = process.env.INTERNAL_API_URL?.replace(/\/$/, "");
  if (!backend) return false;

  try {
    const response = await fetch(`${backend}/api/auth/profile`, {
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
      cache: "no-store",
    });

    return response.ok;
  } catch {
    return false;
  }
}

function hasBlobConfig() {
  return Boolean(
    process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN,
  );
}

function isManagedBlobUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".blob.vercel-storage.com")
    );
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
  }

  if (!hasBlobConfig()) {
    return NextResponse.json(
      { message: "Le stockage d’images persistant n’est pas encore configuré" },
      { status: 503 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("image");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { message: "Aucun fichier envoyé" },
      { status: 400 },
    );
  }

  const extension = EXTENSIONS[file.type];
  if (!extension) {
    return NextResponse.json(
      { message: "Format d’image non supporté" },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { message: "L’image ne doit pas dépasser 5 Mo" },
      { status: 400 },
    );
  }

  const blob = await put(`portfolio/${randomUUID()}.${extension}`, file, {
    access: "public",
    addRandomSuffix: false,
    contentType: file.type,
  });

  return NextResponse.json({ url: blob.url });
}

export async function DELETE(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
  }

  if (!hasBlobConfig()) {
    return NextResponse.json(
      { message: "Le stockage d’images persistant n’est pas encore configuré" },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as { url?: string };
  if (!body.url || !isManagedBlobUrl(body.url)) {
    return NextResponse.json(
      { message: "URL d’image invalide" },
      { status: 400 },
    );
  }

  await del(body.url);
  return NextResponse.json({ message: "Image supprimée" });
}
