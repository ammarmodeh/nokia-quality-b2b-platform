import express from "express";
import { getTrainingSessions, getTrainingSessionById } from "../controllers/trainingSessionController.js";

const router = express.Router();

router.route("/").get(getTrainingSessions);
router.route("/:id").get(getTrainingSessionById);

export default router;
