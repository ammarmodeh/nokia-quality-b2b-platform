// POST /api/<resource>/bulk-delete — permanent delete for one or many records.
// Admins only. Body { ids, confirm: "permanent delete" }; see utils/bulkDelete.js.
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import { bulkDeleteHandler } from "../utils/bulkDelete.js";
import { TaskSchema } from "../models/taskModel.js";
import { TaskTicket } from "../models/taskTicketModel.js";
import { FavouriteSchema } from "../models/favouriteModel.js";
import { CustomerIssueSchema } from "../models/customerIssueModel.js";
import { CustomerIssueLog } from "../models/customerIssueLogModel.js";
import { LabAssessment } from "../models/labAssessmentModel.js";
import { OnTheJobAssessment } from "../models/onTheJobAssessmentModel.js";
import { QuizSchema } from "../models/quizModel.js";
import QuizResult from "../models/quizResultModel.js";
import { DropdownOption } from "../models/dropdownOptionModel.js";
import { FieldTeamsSchema } from "../models/fieldTeamsModel.js";
import { CustomRow } from "../models/customTableModels.js";

const ids = (docs) => docs.map((d) => d._id);

const handlers = {
  // DVOC tasks: their tickets and favourites go with them; table rows keep the row but lose the link
  tasks: bulkDeleteHandler({
    model: TaskSchema,
    cascade: async (docs) => {
      await Promise.all([
        TaskTicket.deleteMany({ taskId: { $in: ids(docs) } }),
        FavouriteSchema.deleteMany({ originalTaskId: { $in: ids(docs) } }),
        CustomRow.updateMany({ linkedTaskId: { $in: ids(docs) } }, { $set: { linkedTaskId: null } }),
      ]);
    },
  }),
  // Snags / complaints (OJO Snags, TCRM, TRC, Internal Audit): tickets go with them; the log keeps a DELETE entry
  "customer-issues": bulkDeleteHandler({
    model: CustomerIssueSchema,
    cascade: async (docs, req) => {
      await TaskTicket.deleteMany({ taskId: { $in: ids(docs) } });
      await CustomerIssueLog.insertMany(
        docs.map((d) => ({ slid: d.slid || "—", issueId: d._id, action: "DELETE", performedBy: req.user?.name || "Unknown", details: `Issue permanently deleted for SLID: ${d.slid}`, prevData: d }))
      );
    },
  }),
  "lab-assessments": bulkDeleteHandler({ model: LabAssessment }),
  "on-the-job-assessments": bulkDeleteHandler({ model: OnTheJobAssessment }),
  quiz: bulkDeleteHandler({ model: QuizSchema }),
  "quiz-results": bulkDeleteHandler({ model: QuizResult }),
  "dropdown-options": bulkDeleteHandler({ model: DropdownOption }),
  // A team that has history can't be deleted: tasks, assessments and quiz results point at it.
  "field-teams": bulkDeleteHandler({
    model: FieldTeamsSchema,
    blockedBy: async (docs) => {
      const list = ids(docs);
      const [tasks, lab, ojt, quiz] = await Promise.all([
        TaskSchema.aggregate([{ $match: { teamId: { $in: list } } }, { $group: { _id: "$teamId", n: { $sum: 1 } } }]),
        LabAssessment.aggregate([{ $match: { fieldTeamId: { $in: list } } }, { $group: { _id: "$fieldTeamId", n: { $sum: 1 } } }]),
        OnTheJobAssessment.aggregate([{ $match: { fieldTeamId: { $in: list } } }, { $group: { _id: "$fieldTeamId", n: { $sum: 1 } } }]),
        QuizResult.aggregate([{ $match: { teamId: { $in: list } } }, { $group: { _id: "$teamId", n: { $sum: 1 } } }]),
      ]);
      const uses = new Map();
      const add = (rows, what) => rows.forEach((r) => uses.set(String(r._id), [...(uses.get(String(r._id)) || []), `${r.n} ${what}`]));
      add(tasks, "task(s)");
      add(lab, "lab assessment(s)");
      add(ojt, "on-the-job assessment(s)");
      add(quiz, "quiz result(s)");
      return new Map([...uses].map(([id, what]) => [id, `Still linked to ${what.join(", ")}. Terminate or mark the team resigned instead, or delete those records first.`]));
    },
  }),
};

export const mountBulkDelete = (app) => {
  for (const [resource, handler] of Object.entries(handlers)) {
    app.post(`/api/${resource}/bulk-delete`, protect, adminOnly, handler);
  }
};
