import mongoose from "mongoose";

const docSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, required: true }, // PDF, DOCX, LINK, etc.
    size: { type: String }, // 2.4 MB
    href: { type: String, required: true }, // URL or File Path
    category: { type: String, required: true }, // 'field' or 'qos'
    uploader: { type: String, required: true },
    isExternalLink: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Doc = mongoose.model("Doc", docSchema);

export default Doc;
