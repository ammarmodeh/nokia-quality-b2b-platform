import express from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import * as c from "../controllers/qopsController.js";

// Express 4 doesn't forward rejected promises; send them to the error handler.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// /api/trackers — everyone reads; admins add, rename, archive
export const trackerRouter = express.Router();
trackerRouter.use(protect);
trackerRouter.get("/", wrap(c.listTrackers));
trackerRouter.post("/", adminOnly, wrap(c.createTracker));
trackerRouter.patch("/:id", adminOnly, wrap(c.updateTracker));
trackerRouter.post("/:id/delete", adminOnly, wrap(c.deleteTracker));

// /api/team-codes — code history; admins edit it
export const teamCodeRouter = express.Router();
teamCodeRouter.use(protect);
teamCodeRouter.get("/", wrap(c.listTeamCodes));
teamCodeRouter.get("/resolve", wrap(c.resolveTeamCode));
teamCodeRouter.post("/", adminOnly, wrap(c.createTeamCode));
teamCodeRouter.patch("/:id", adminOnly, wrap(c.updateTeamCode));
teamCodeRouter.delete("/:id", adminOnly, wrap(c.deleteTeamCode));

// /api/calendar-entries — anyone signed in schedules tickets
export const calendarEntryRouter = express.Router();
calendarEntryRouter.use(protect);
calendarEntryRouter.get("/", wrap(c.listEntries));
calendarEntryRouter.post("/", wrap(c.createEntry));
calendarEntryRouter.patch("/:id", wrap(c.updateEntry));
calendarEntryRouter.delete("/:id", wrap(c.deleteEntry));

// /api/team-analytics — per-team analysis across trackers and assessments
export const teamAnalyticsRouter = express.Router();
teamAnalyticsRouter.use(protect);
teamAnalyticsRouter.get("/", wrap(c.teamMatrix));
teamAnalyticsRouter.get("/:teamId", wrap(c.teamDetail));
