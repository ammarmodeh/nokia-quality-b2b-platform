import express from "express";
import {
  getUserNotes,
  createNote,
  updateNote,
  deleteNote,
  togglePin,
  toggleArchive,
} from "../controllers/userNoteControllers.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.route("/").get(getUserNotes).post(createNote);
router.route("/:id").put(updateNote).delete(deleteNote);
router.patch("/:id/pin", togglePin);
router.patch("/:id/archive", toggleArchive);

export default router;
