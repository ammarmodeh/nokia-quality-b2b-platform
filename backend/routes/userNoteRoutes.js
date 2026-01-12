import express from "express";
import {
  getUserNotes,
  createNote,
  updateNote,
  deleteNote,
  togglePin,
} from "../controllers/userNoteControllers.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.route("/").get(getUserNotes).post(createNote);
router.route("/:id").put(updateNote).delete(deleteNote);
router.patch("/:id/pin", togglePin);

export default router;
