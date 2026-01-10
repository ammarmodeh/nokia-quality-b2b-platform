import Doc from "../models/docModel.js";
import fs from "fs";
import path from "path";

// Default Data from DocsMenu
const defaultFieldDocs = [
  { title: "Comprehensive Action Plan for Training Field Teams and Improving NPS", href: "https://drive.google.com/file/d/1NSgGNi1qWC9UiWLEmJOxesx5IOZwyAcf/view?usp=sharing" },
  { title: "Factors affecting gaming ping in arabic", href: "https://drive.google.com/file/d/1yV_OSTqxoWUBxvhiFV7nj-FH4HYdxpA3/view?usp=drive_link" },
  { title: "Factors Affecting VPN Connections in arabic", href: "https://drive.google.com/file/d/1vn3uGGRIWxmwPIvWgEA0F4uQdFZHSUn7/view?usp=drive_link" },
  { title: "Labeling Standard", href: "https://drive.google.com/file/d/1kqNm-6EtBSUf8M0yWrJ1mWT2FmmF68oB/view?usp=drive_link" },
  { title: "Nokia G-140W-C Configuration", href: "https://drive.google.com/file/d/15P_OzblC8a6tIIyQfpE4_DBEpYXxCp6R/view?usp=drive_link" },
  { title: "Nokia G-2426G-P (WiFi 6)", href: "https://drive.google.com/file/d/1i-88cqu5lfa4_gXmIPI1EzF9V-i4NM8O/view?usp=drive_link" },
  { title: "ONT Config Steps - NOKIA Type-H", href: "https://drive.google.com/file/d/18DoLwOu5VHlak47-wBRp00wXAjso_Nt4/view?usp=drive_link" },
  { title: "The best place for wireless router in arabic", href: "https://drive.google.com/file/d/14AOMy7zwogwnlrt9azJ2TYiognxG4llY/view?usp=drive_link" },
  { title: "Tips on how to talk to customers in arabic", href: "https://drive.google.com/file/d/1gZdSFiyxVdjAxHLdI2UuZZAytwIZCKKP/view?usp=drive_link" },
  { title: "Troubleshoot common IPTV problems in arabic", href: "https://drive.google.com/file/d/1OicDupRWjCX75kc3EoDl46qQVG_z4sSf/view?usp=drive_link" },
  { title: "ZTE F6600P", href: "https://drive.google.com/file/d/1JTbu7c5LxUPGZMMywE_1A4fPQ46mWrdY/view?usp=drive_link" },
  { title: "Being Effective Worker at Workplace", href: "https://drive.google.com/file/d/1wSSfzr_hxtPO0vZSMyPeLPQu8W7vxrky/view?usp=drive_link" },
  { title: "Electrod lifetime", href: "https://drive.google.com/file/d/14KX8PnfBTDn2yPkLPQFMXdACbMmqgK2g/view?usp=drive_link" },
  { title: "Factors affect optical fiber splicing loss", href: "https://drive.google.com/file/d/1ksbOKaVe4cE1Y7ibxNpmqhkWoq5rbHbt/view?usp=drive_link" },
  { title: "fusion-splicing arc calibration and cleaning session .-44-46", href: "https://drive.google.com/file/d/1iU2Yz5PWyuu54p8A7h_pZqaPEzN464eo/view?usp=drive_link" },
  { title: "How to check the strength of your Wi-Fi signal and interpret or improve its strength level", href: "https://drive.google.com/file/d/1Lua0kWIdVTKvmYsVDEI_MxFElsIRl7aO/view?usp=drive_link" },
  { title: "Media Streamers Tech Specifications", href: "https://drive.google.com/file/d/1Ev2Lx1wkFcsZ2kd4WIbDmYzUKpS1LOih/view?usp=drive_link" },
  { title: "Must-have Tools for Fiber Optic Technicians", href: "https://docs.google.com/document/d/1pjJNIKl9P3oLpiqNHe71oSsZy6sUUedC/edit?usp=drive_link&ouid=109709095419447676835&rtpof=true&sd=true" },
  { title: "ways to troubleshoot and fix any Wi-Fi problems you're encountering", href: "https://docs.google.com/document/d/1TXluJoZyAcBuTcENXTfpYJX9Zo3gihsS/edit?usp=drive_link&ouid=109709095419447676835&rtpof=true&sd=true" },
  { title: "WiFi", href: "https://drive.google.com/file/d/1jbfbxrOjJv1Erk9wn08AjvOlviK0Yr1r/view?usp=drive_link" },
];

const defaultQosDocs = [
  { title: "Effective Strategies to Boost NPS Score", href: "https://drive.google.com/uc?export=download&id=10BcFCraai2s0ede-eK4KSXYqgLmfou5m" },
  { title: "Site Inspection Checklist 2024", href: "https://drive.google.com/uc?export=download&id=1Y7H0XFl4nkRCiucOO874fx6Ot4JVgn11" },
];

const seedDefaults = async () => {
  const fieldDocs = defaultFieldDocs.map(d => ({
    name: d.title,
    href: d.href,
    category: 'field',
    type: 'LINK',
    uploader: 'System',
    size: '0 KB',
    isExternalLink: true
  }));

  const qosDocs = defaultQosDocs.map(d => ({
    name: d.title,
    href: d.href,
    category: 'qos',
    type: 'LINK',
    uploader: 'System',
    size: '0 KB',
    isExternalLink: true
  }));

  await Doc.insertMany([...fieldDocs, ...qosDocs]);
}

// Get all documents
export const getDocs = async (req, res) => {
  try {
    const count = await Doc.countDocuments();
    if (count === 0) {
      await seedDefaults();
    }

    const docs = await Doc.find({ active: true }).sort({ createdAt: -1 });
    res.status(200).json(docs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add a document (Link only now, but code supports structure)
export const addDoc = async (req, res) => {
  try {
    const { name, category, type, href, isExternalLink } = req.body;
    const uploader = req.user ? req.user.name : "Admin";

    // Basic structure, ignoring file upload logic as it's been reverted to links
    const doc = await Doc.create({
      name,
      type: type || "LINK",
      size: "0 KB", // Links don't have size
      href,
      category,
      uploader,
      isExternalLink: true,
    });

    res.status(201).json(doc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a document
export const deleteDoc = async (req, res) => {
  try {
    const { id } = req.params;
    await Doc.findByIdAndDelete(id);
    res.status(200).json({ message: "Document deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Document
export const updateDoc = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, href } = req.body;

    const doc = await Doc.findByIdAndUpdate(id, { name, href }, { new: true });
    res.status(200).json(doc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}
