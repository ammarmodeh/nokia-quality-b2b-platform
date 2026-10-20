// Stores uploaded files (templates, imports, attachments) with metadata.
// Uses the project's S3 bucket when configured, otherwise backend/uploads/stored.
// Files are private: they are served only through the protected download route.
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { StoredFile } from "../models/customTableModels.js";

const useS3 = () => Boolean(process.env.AWS_S3_BUCKET && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
let s3;
const client = () =>
  (s3 ||= new S3Client({
    region: process.env.AWS_REGION,
    credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY },
  }));
const localDir = () => path.join(path.resolve(), "uploads", "stored");
const safeName = (n) => String(n || "file").replace(/[^\w.\-() ]+/g, "_").slice(-120);

export const MAX_FILE_BYTES = 15 * 1024 * 1024;

/** Save a buffer and record it. links: { tableId, templateId, importBatchId, purpose } */
export const saveFile = async ({ buffer, originalName, mimeType }, user, links = {}) => {
  const checksum = crypto.createHash("sha256").update(buffer).digest("hex");
  const key = `custom-tables/${new Date().toISOString().slice(0, 7)}/${Date.now()}-${checksum.slice(0, 8)}-${safeName(originalName)}`;
  let storage = "local";
  if (useS3()) {
    await client().send(new PutObjectCommand({ Bucket: process.env.AWS_S3_BUCKET, Key: key, Body: buffer, ContentType: mimeType || "application/octet-stream" }));
    storage = "s3";
  } else {
    const full = path.join(localDir(), key);
    await fs.promises.mkdir(path.dirname(full), { recursive: true });
    await fs.promises.writeFile(full, buffer);
  }
  return StoredFile.create({ originalName, mimeType, size: buffer.length, storage, storagePath: key, checksum, uploadedBy: user?._id, ...links });
};

/** Pipe a stored file to an Express response. */
export const streamFile = async (file, res, { inline = false } = {}) => {
  res.setHeader("Content-Type", file.mimeType || "application/octet-stream");
  res.setHeader("Content-Disposition", `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.originalName)}`);
  if (file.storage === "s3") {
    const out = await client().send(new GetObjectCommand({ Bucket: process.env.AWS_S3_BUCKET, Key: file.storagePath }));
    out.Body.pipe(res);
    return;
  }
  const full = path.join(localDir(), file.storagePath);
  if (!full.startsWith(localDir())) throw new Error("Invalid path");
  fs.createReadStream(full).on("error", () => res.status(404).end()).pipe(res);
};
