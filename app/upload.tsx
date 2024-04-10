"use server";

import fs from "fs/promises";
import pdf from "@cyber2024/pdf-parse-fixed";
import path from "path";

export async function upload(formData: FormData) {
  const file = formData.get("file") as File;

  const buffer = await file.arrayBuffer();
  await fs.writeFile(
    path.join(process.cwd(), "app/cvs", file.name),
    Buffer.from(buffer)
  );
}
