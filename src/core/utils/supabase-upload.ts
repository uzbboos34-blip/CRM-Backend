import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

let supabaseClient: SupabaseClient | null = null;

export async function uploadToSupabase(filename: string): Promise<string> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  const filePath = path.join(process.cwd(), "src", "uploads", filename);

  if (!url || !key) {
    console.warn("Supabase credentials missing, keeping file locally.");
    return filename;
  }

  if (!fs.existsSync(filePath)) {
    return filename;
  }

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(filename).toLowerCase();

    // Define mime type
    let contentType = "application/octet-stream";
    if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    else if (ext === ".png") contentType = "image/png";
    else if (ext === ".gif") contentType = "image/gif";
    else if (ext === ".pdf") contentType = "application/pdf";
    else if (ext === ".mp4") contentType = "video/mp4";
    else if (ext === ".zip") contentType = "application/zip";

    if (!supabaseClient) {
      supabaseClient = createClient(url, key);
    }

    const { error } = await supabaseClient.storage
      .from("NajotEdu")
      .upload(filename, fileBuffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.error(`Supabase upload failed: ${error.message}`);
      return filename; // Fallback to local
    }

    // Delete local file to save space
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      console.error("Failed to delete temporary local file:", e);
    }
  } catch (err) {
    console.error("Error during Supabase upload:", err);
  }

  return filename;
}
