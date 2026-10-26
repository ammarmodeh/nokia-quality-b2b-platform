import mongoose from "mongoose";
import { SlaRecord } from "../models/slaModel.js";
import { CalendarEntry } from "../models/qopsModels.js";
import { TaskSchema } from "../models/taskModel.js";
import { CustomerIssueSchema } from "../models/customerIssueModel.js";
import { CustomTable, CustomRow } from "../models/customTableModels.js";
import { FieldTeamsSchema } from "../models/fieldTeamsModel.js";
import { makeResolver, normCode } from "../utils/teamCodes.js";

const oid = (v) => mongoose.Types.ObjectId.isValid(String(v));
const fail = (res, code, message) => res.status(code).json({ message });

/** Take a live snapshot of the target entity (Task, Issue, or CustomRow) */
const resolveTargetSnapshot = async (kind, id, tableId) => {
  if (!oid(id)) return null;

  if (kind === "task") {
    const task = await TaskSchema.findById(id).lean();
    if (!task) return null;
    return {
      target: { kind, id: task._id, tableId: null },
      slid: task.slid || "",
      title: task.customerName || task.slid || "Task",
      issueCategory: task.issueCategory || "DVOC",
      issueSubCategory: task.issueSubCategory || "Installation",
      tableName: null,
      fieldTeamId: task.teamId || null,
      teamName: task.teamName || null,
      teamCode: null,
    };
  }

  if (kind === "issue") {
    const issue = await CustomerIssueSchema.findById(id).lean();
    if (!issue) return null;
    const resolver = makeResolver();
    const hit = issue.teamCode ? await resolver(issue.teamCode, issue.date || issue.createdAt) : null;
    return {
      target: { kind, id: issue._id, tableId: null },
      slid: issue.slid || "",
      title: issue.customerName || issue.slid || "Snag",
      issueCategory: issue.issueCategory || (issue.fromMain === "Complaints" ? "OJO Complaints" : "OJO Snags"),
      issueSubCategory: issue.issueSubCategory || issue.fromSub || "Installation",
      tableName: null,
      fieldTeamId: hit?.fieldTeamId || null,
      teamName: issue.teamName || hit?.teamName || null,
      teamCode: normCode(issue.teamCode),
    };
  }

  if (kind === "row") {
    const row = await CustomRow.findOne({ _id: id, deleted: false }).lean();
    if (!row) return null;
    const table = await CustomTable.findById(row.tableId).lean();
    if (!table) return null;
    const primary = table.fields?.find((f) => f.key === table.primaryField);
    const primaryVal = primary && row.data?.[primary.key] ? String(row.data[primary.key]) : `#${row.autoNumber}`;
    const team = row.fieldTeamId ? await FieldTeamsSchema.findById(row.fieldTeamId, { teamName: 1, teamCode: 1 }).lean() : null;

    return {
      target: { kind, id: row._id, tableId: table._id },
      slid: row.slid || "",
      title: primaryVal,
      issueCategory: table.issueCategory || "Custom Table",
      issueSubCategory: table.issueSubCategory || null,
      tableName: table.name,
      fieldTeamId: row.fieldTeamId || null,
      teamName: team?.teamName || null,
      teamCode: row.teamCode || team?.teamCode || null,
    };
  }

  return null;
};

/**
 * POST /api/sla/apply
 * Apply or update SLA for a ticket. Optionally syncs with the calendar.
 */
export const applySla = async (req, res) => {
  try {
    const {
      target,
      slaHours = 24,
      targetDate,
      warningThresholdHours = 4,
      priority = "Medium",
      addToCalendar = true,
      note = "",
      ticketCreationDate,
      responseDate,
      noResponse = false,
      slaDifferenceHours,
      slaDifferenceText = "",
      closedBy = "",
      isCustomerRequested = false,
    } = req.body;
    if (!target?.kind || !target?.id) return fail(res, 400, "Target kind and ID are required");

    const snap = await resolveTargetSnapshot(target.kind, target.id, target.tableId);
    if (!snap) return fail(res, 404, "Target ticket was not found");

    const start = ticketCreationDate && !isNaN(new Date(ticketCreationDate).getTime())
      ? new Date(ticketCreationDate)
      : new Date();

    let deadline;
    if (targetDate && !isNaN(new Date(targetDate).getTime())) {
      deadline = new Date(targetDate);
    } else {
      deadline = new Date(start.getTime() + Number(slaHours) * 3600 * 1000);
    }

    let parsedResponseDate = responseDate && !isNaN(new Date(responseDate).getTime()) ? new Date(responseDate) : null;
    if (noResponse) parsedResponseDate = null;

    // Determine status
    let computedStatus = "active";
    let isBreached = false;
    let teamExempt = Boolean(isCustomerRequested);

    if (noResponse) {
      computedStatus = teamExempt ? "met" : "breached";
      isBreached = !teamExempt;
    } else if (parsedResponseDate) {
      const diffHours = typeof slaDifferenceHours === "number" && !isNaN(slaDifferenceHours)
        ? slaDifferenceHours
        : +((parsedResponseDate.getTime() - start.getTime()) / 3600000).toFixed(2);

      const withinSla = diffHours <= (Number(slaHours) || 24);
      if (withinSla || teamExempt) {
        computedStatus = "met";
        isBreached = false;
      } else {
        computedStatus = "breached";
        isBreached = true;
      }
    }

    let calendarEntryId = null;
    if (addToCalendar) {
      let entry = await CalendarEntry.findOne({ "target.id": snap.target.id });
      const entryData = {
        target: snap.target,
        date: deadline,
        time: deadline.toTimeString().slice(0, 5),
        type: "SLA Deadline",
        note: note || `SLA Deadline (${priority} priority) · ${snap.title}`,
        status: computedStatus === "met" ? "done" : "planned",
        title: snap.title,
        slid: snap.slid,
        issueCategory: snap.issueCategory,
        issueSubCategory: snap.issueSubCategory,
        tableName: snap.tableName,
        fieldTeamId: snap.fieldTeamId,
        teamName: snap.teamName,
        createdBy: req.user?._id,
        updatedBy: req.user?._id,
      };

      if (entry) {
        Object.assign(entry, entryData);
        await entry.save();
      } else {
        entry = await CalendarEntry.create(entryData);
      }
      calendarEntryId = entry._id;
    }

    // Upsert SlaRecord
    let sla = await SlaRecord.findOne({ "target.id": snap.target.id });
    const patch = {
      ...snap,
      slaHours: Number(slaHours) || 24,
      startDate: start,
      ticketCreationDate: start,
      targetDate: deadline,
      responseDate: parsedResponseDate,
      noResponse: Boolean(noResponse),
      slaDifferenceHours: typeof slaDifferenceHours === "number" && !isNaN(slaDifferenceHours) ? slaDifferenceHours : null,
      slaDifferenceText: String(slaDifferenceText || "").trim(),
      closedBy: String(closedBy || "").trim(),
      warningThresholdHours: Number(warningThresholdHours) || 4,
      priority,
      status: computedStatus,
      isBreached,
      teamExempt,
      resolvedAt: parsedResponseDate || (noResponse ? new Date() : null),
      resolutionNote: note,
      updatedBy: req.user?._id,
    };
    if (calendarEntryId) patch.calendarEntryId = calendarEntryId;

    if (sla) {
      Object.assign(sla, patch);
      await sla.save();
    } else {
      sla = await SlaRecord.create({
        ...patch,
        createdBy: req.user?._id,
      });
    }

    res.status(200).json({ success: true, sla });
  } catch (err) {
    fail(res, 500, err.message);
  }
};

/**
 * GET /api/sla/target/:kind/:id
 * Get SLA status & renewal history for a single ticket.
 */
export const getTargetSla = async (req, res) => {
  try {
    const { kind, id } = req.params;
    if (!oid(id)) return res.json(null);

    const sla = await SlaRecord.findOne({ "target.kind": kind, "target.id": id })
      .populate("fieldTeamId", "teamName teamCode teamCompany")
      .populate("renewals.renewedBy", "name email")
      .populate("resolvedBy", "name email")
      .lean();

    if (!sla) return res.json(null);

    const now = Date.now();
    const targetMs = new Date(sla.targetDate).getTime();
    const warningMs = (sla.warningThresholdHours || 4) * 3600 * 1000;

    let computedStatus = sla.status;
    let isBreached = sla.isBreached;
    let isAboutToBreach = false;

    if (sla.status === "active") {
      if (now > targetMs) {
        computedStatus = "breached";
        isBreached = true;
      } else if (targetMs - now <= warningMs) {
        isAboutToBreach = true;
      }
    }

    res.json({
      ...sla,
      computedStatus,
      isBreached,
      isAboutToBreach,
      hoursRemaining: +( (targetMs - now) / 3600000 ).toFixed(1),
    });
  } catch (err) {
    fail(res, 500, err.message);
  }
};

/**
 * POST /api/sla/:id/renew
 * Customer requested reschedule or SLA renewal.
 * Crucial feature: If customer requested, teamExempt is set to true so the team does NOT bear fault!
 */
export const renewSla = async (req, res) => {
  try {
    const { id } = req.params;
    if (!oid(id)) return fail(res, 404, "SLA record not found");

    const { newTargetDate, reason = "Customer requested reschedule", isCustomerRequested = true, note = "" } = req.body;
    if (!newTargetDate || isNaN(new Date(newTargetDate).getTime())) {
      return fail(res, 400, "Valid new target date/time is required");
    }

    const sla = await SlaRecord.findById(id);
    if (!sla) return fail(res, 404, "SLA record not found");

    const previousTargetDate = sla.targetDate;
    const deadline = new Date(newTargetDate);

    sla.renewals.push({
      previousTargetDate,
      newTargetDate: deadline,
      reason: String(reason).trim() || "Rescheduled",
      isCustomerRequested: Boolean(isCustomerRequested),
      note: String(note).trim(),
      renewedBy: req.user?._id,
      renewedAt: new Date(),
    });

    sla.targetDate = deadline;
    sla.status = "active";
    sla.isBreached = false;
    if (isCustomerRequested) {
      sla.teamExempt = true; // Team does NOT bear responsibility for this reschedule
    }
    sla.updatedBy = req.user?._id;
    await sla.save();

    // Update calendar entry if linked
    if (sla.calendarEntryId) {
      await CalendarEntry.findByIdAndUpdate(sla.calendarEntryId, {
        date: deadline,
        time: deadline.toTimeString().slice(0, 5),
        note: `Rescheduled SLA: ${reason}${note ? ` · ${note}` : ""}`,
        status: "planned",
        updatedBy: req.user?._id,
      });
    }

    res.json({ success: true, sla });
  } catch (err) {
    fail(res, 500, err.message);
  }
};

/**
 * POST /api/sla/:id/resolve
 * Mark ticket SLA resolved, stamping whether it was on-time or breached.
 */
export const resolveSla = async (req, res) => {
  try {
    const { id } = req.params;
    if (!oid(id)) return fail(res, 404, "SLA record not found");

    const {
      resolutionNote = "",
      resolvedAt = new Date(),
      ticketCreationDate,
      responseDate,
      noResponse = false,
      slaDifferenceHours,
      slaDifferenceText,
      closedBy = "",
    } = req.body;
    const sla = await SlaRecord.findById(id);
    if (!sla) return fail(res, 404, "SLA record not found");

    if (ticketCreationDate) sla.ticketCreationDate = new Date(ticketCreationDate);
    if (responseDate) sla.responseDate = new Date(responseDate);
    sla.noResponse = Boolean(noResponse);
    if (slaDifferenceHours !== undefined) sla.slaDifferenceHours = slaDifferenceHours;
    if (slaDifferenceText) sla.slaDifferenceText = slaDifferenceText;
    if (closedBy) sla.closedBy = closedBy;

    const resolveDate = new Date(resolvedAt || sla.responseDate || Date.now());
    const targetDate = new Date(sla.targetDate);

    if (noResponse) {
      sla.status = sla.teamExempt ? "met" : "breached";
      sla.isBreached = !sla.teamExempt;
    } else {
      const onTime = resolveDate <= targetDate || sla.teamExempt || (sla.slaDifferenceHours !== null && sla.slaDifferenceHours <= sla.slaHours);
      sla.status = onTime ? "met" : "breached";
      sla.isBreached = !onTime;
    }

    sla.resolvedAt = resolveDate;
    sla.resolvedBy = req.user?._id;
    sla.resolutionNote = String(resolutionNote).trim();
    sla.updatedBy = req.user?._id;
    await sla.save();

    // Mark calendar entry done
    if (sla.calendarEntryId) {
      await CalendarEntry.findByIdAndUpdate(sla.calendarEntryId, {
        status: "done",
        updatedBy: req.user?._id,
      });
    }

    res.json({ success: true, sla });
  } catch (err) {
    fail(res, 500, err.message);
  }
};

/**
 * GET /api/sla/list
 * Query list of SLAs with filtering.
 */
export const listSlas = async (req, res) => {
  try {
    const { status, teamId, kind, q, limit = 100 } = req.query;
    const filter = {};

    if (teamId && oid(teamId)) filter.fieldTeamId = teamId;
    if (kind) filter["target.kind"] = kind;
    if (q) {
      filter.$or = [
        { slid: new RegExp(q, "i") },
        { title: new RegExp(q, "i") },
        { teamName: new RegExp(q, "i") },
      ];
    }

    const now = Date.now();

    if (status === "breached") {
      filter.$or = [
        { status: "breached" },
        { status: "active", targetDate: { $lt: new Date() } },
      ];
    } else if (status === "about_to_breach") {
      filter.status = "active";
      filter.targetDate = {
        $gte: new Date(),
        $lte: new Date(now + 24 * 3600 * 1000),
      };
    } else if (status && status !== "all") {
      filter.status = status;
    }

    const items = await SlaRecord.find(filter)
      .sort({ targetDate: 1 })
      .limit(Number(limit))
      .populate("fieldTeamId", "teamName teamCode teamCompany")
      .lean();

    const enriched = items.map((s) => {
      const targetMs = new Date(s.targetDate).getTime();
      const warningMs = (s.warningThresholdHours || 4) * 3600 * 1000;
      let computedStatus = s.status;
      if (s.status === "active") {
        if (now > targetMs) computedStatus = "breached";
        else if (targetMs - now <= warningMs) computedStatus = "about_to_breach";
      }
      return {
        ...s,
        computedStatus,
        hoursRemaining: +( (targetMs - now) / 3600000 ).toFixed(1),
      };
    });

    res.json(enriched);
  } catch (err) {
    fail(res, 500, err.message);
  }
};

/**
 * GET /api/sla/notifications
 * Fast live alert count and items for the top navigation bar.
 */
export const getSlaNotifications = async (req, res) => {
  try {
    const now = new Date();
    const warningHorizon = new Date(Date.now() + 24 * 3600 * 1000);

    const [breached, aboutToBreach] = await Promise.all([
      SlaRecord.find({
        $or: [
          { status: "breached" },
          { status: "active", targetDate: { $lt: now } },
        ],
      })
        .sort({ targetDate: -1 })
        .limit(20)
        .lean(),

      SlaRecord.find({
        status: "active",
        targetDate: { $gte: now, $lte: warningHorizon },
      })
        .sort({ targetDate: 1 })
        .limit(20)
        .lean(),
    ]);

    const formatItem = (item, type) => {
      const diffHours = +( (new Date(item.targetDate).getTime() - Date.now()) / 3600000 ).toFixed(1);
      const link =
        item.target.kind === "task"
          ? `/dvoc-installations?task=${item.target.id}`
          : item.target.kind === "issue"
          ? `/ojo-snags?q=${encodeURIComponent(item.slid || "")}`
          : `/tables/${item.target.tableId}?row=${item.target.id}`;

      return {
        id: item._id,
        type, // 'breached' | 'warning'
        title: item.title,
        slid: item.slid,
        teamName: item.teamName,
        category: item.issueCategory,
        targetDate: item.targetDate,
        diffHours,
        link,
      };
    };

    res.json({
      breachedCount: breached.length,
      aboutToBreachCount: aboutToBreach.length,
      totalAlerts: breached.length + aboutToBreach.length,
      items: [
        ...breached.map((b) => formatItem(b, "breached")),
        ...aboutToBreach.map((w) => formatItem(w, "warning")),
      ],
    });
  } catch (err) {
    fail(res, 500, err.message);
  }
};

/**
 * GET /api/sla/team-performance/:teamId
 * SLA metrics for a team: Compliance %, Breached %, Customer Rescheduled.
 */
export const getTeamSlaPerformance = async (req, res) => {
  try {
    const { teamId } = req.params;
    if (!oid(teamId)) return fail(res, 404, "Invalid team ID");

    const slas = await SlaRecord.find({ fieldTeamId: teamId }).lean();
    const now = Date.now();

    let total = slas.length;
    let met = 0;
    let breached = 0;
    let active = 0;
    let customerRescheduled = 0;
    let noResponseCount = 0;

    for (const s of slas) {
      if (s.noResponse) {
        noResponseCount++;
      }
      if (s.renewals?.some((r) => r.isCustomerRequested) || s.teamExempt) {
        customerRescheduled++;
      }
      if (s.status === "met" || s.teamExempt) {
        met++;
      } else if (s.noResponse || s.status === "breached" || (s.status === "active" && new Date(s.targetDate).getTime() < now && !s.teamExempt)) {
        breached++;
      } else if (s.status === "active") {
        active++;
      }
    }

    const closed = met + breached;
    // Customer rescheduled SLAs do NOT count against the team:
    const complianceRate = closed > 0 ? Math.round(((met) / closed) * 100) : 100;

    res.json({
      teamId,
      total,
      active,
      met,
      breached,
      customerRescheduled,
      noResponseCount,
      complianceRate,
    });
  } catch (err) {
    fail(res, 500, err.message);
  }
};
