import crypto from "crypto";

/**
 * Cheap collection fingerprint: document count + newest updatedAt.
 * Needs an { updatedAt: -1 } index to stay a single index read.
 * Catches inserts, deletes and mongoose updates (timestamps: true bumps updatedAt).
 */
export const collectionVersion = async (Model) => {
  const [count, newest] = await Promise.all([
    Model.countDocuments({}),
    Model.findOne({}, { updatedAt: 1 }).sort({ updatedAt: -1 }).lean(),
  ]);
  return `${count}:${newest?.updatedAt ? new Date(newest.updatedAt).getTime() : 0}`;
};

/**
 * Conditional GET: answers 304 when the client's cached copy is still current,
 * so the expensive query and the payload are skipped entirely.
 * Returns true when the response was already sent.
 */
export const notModified = (req, res, parts) => {
  const etag = `W/"${crypto.createHash("sha1").update(parts.join("|")).digest("base64url")}"`;
  res.set("ETag", etag);
  // private: per-user (auth) response; no-cache: the browser must revalidate every time, which is the 304 path.
  res.set("Cache-Control", "private, no-cache");
  const sent = req.get("If-None-Match");
  if (sent && sent.split(/\s*,\s*/).includes(etag)) {
    res.status(304).end();
    return true;
  }
  return false;
};
