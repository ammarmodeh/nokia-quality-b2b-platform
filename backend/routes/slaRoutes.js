import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  applySla,
  getTargetSla,
  renewSla,
  resolveSla,
  listSlas,
  getSlaNotifications,
  getTeamSlaPerformance,
} from "../controllers/slaController.js";

const router = express.Router();

router.use(protect);

router.post("/apply", applySla);
router.get("/target/:kind/:id", getTargetSla);
router.post("/:id/renew", renewSla);
router.post("/:id/resolve", resolveSla);
router.get("/list", listSlas);
router.get("/notifications", getSlaNotifications);
router.get("/team-performance/:teamId", getTeamSlaPerformance);

export default router;
