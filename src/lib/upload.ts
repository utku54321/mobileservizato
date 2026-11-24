import { api } from "./api";

/**
 * Signed Cloudinary upload, same as the website: the backend signs a timestamp,
 * the app uploads the photo straight to Cloudinary, then sends the URL to the job.
 */
export async function uploadPhoto(uri: string, mimeType = "image/jpeg") {
  const sig = await api.post<{ timestamp: number; signature: string; api_key: string; cloudName: string }>(
    "/api/upload/signature",
  );
  const form = new FormData();
  const name = uri.split("/").pop() || `proof-${Date.now()}.jpg`;
  form.append("file", { uri, name, type: mimeType } as unknown as Blob);
  form.append("api_key", sig.api_key);
  form.append("timestamp", String(sig.timestamp));
  form.append("signature", sig.signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
    method: "POST",
    body: form,
  });
  const data = (await response.json()) as { secure_url?: string; public_id?: string; error?: { message?: string } };
  if (!response.ok || !data.secure_url) throw new Error(data.error?.message || "Photo upload failed. Try again.");
  return { url: data.secure_url, publicId: data.public_id || "" };
}
