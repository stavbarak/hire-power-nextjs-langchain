"use server";

import fs from "fs/promises";
import path from "path";

/**
 * Upload a file to the server
 * This is a server-side function that can be called from the client
 * @param formData
 */
export async function upload(formData: FormData) {
  const file = formData.get("file") as File;

  const buffer = await file.arrayBuffer();

  await fs.writeFile(
    path.join(process.cwd(), "app/cvs", file.name),
    Buffer.from(buffer)
  );
}
