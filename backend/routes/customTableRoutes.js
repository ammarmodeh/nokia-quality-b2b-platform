import express from "express";
import multer from "multer";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import * as c from "../controllers/customTableController.js";
import * as tpl from "../controllers/tableTemplateController.js";
import { MAX_FILE_BYTES } from "../utils/fileStore.js";

// Express 4 doesn't forward rejected promises; send them to the error handler.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_BYTES } });

// /api/custom-tables — admins manage tables and fields; everyone signed in works with rows, views and imports
export const customTableRouter = express.Router();
const r = customTableRouter;
r.use(protect);
r.get("/field-types", c.fieldTypes);
r.get("/calendar", wrap(c.calendarEvents));
r.get("/summary", wrap(c.summary));
r.get("/", wrap(c.listTables));
r.post("/", adminOnly, wrap(c.createTable));
r.get("/:id", wrap(c.getTable));
r.patch("/:id", adminOnly, wrap(c.updateTable));
r.delete("/:id", adminOnly, wrap(c.deleteTable));

r.post("/:id/fields", adminOnly, wrap(c.addField));
r.put("/:id/fields/order", adminOnly, wrap(c.reorderFields));
r.post("/:id/fields/:key/convert-preview", adminOnly, wrap(c.convertPreview));
r.patch("/:id/fields/:key", adminOnly, wrap(c.updateField));
r.delete("/:id/fields/:key", adminOnly, wrap(c.archiveField));
r.post("/:id/fields/:key/restore", adminOnly, wrap(c.restoreField));

r.get("/:id/rows", wrap(c.listRows));
r.post("/:id/rows", wrap(c.createRow));
r.post("/:id/rows/bulk", wrap(c.bulkRows));
r.post("/:id/rows/delete", wrap(c.deleteRows));
r.post("/:id/rows/restore", wrap(c.deleteRows));
r.patch("/:id/rows/:rowId", wrap(c.updateRow));
r.get("/:id/rows/:rowId/activity", wrap(c.rowActivity));

r.get("/:id/views", wrap(c.listViews));
r.post("/:id/views", wrap(c.saveView));
r.patch("/:id/views/:viewId", wrap(c.saveView));
r.delete("/:id/views/:viewId", wrap(c.deleteView));

r.post("/:id/import", wrap(c.importRows));
r.get("/:id/batches", wrap(c.listBatches));
r.post("/:id/batches/:batchId/finish", wrap(c.finishBatch));
r.post("/:id/batches/:batchId/rollback", wrap(c.rollbackBatch));
r.post("/:tableId/save-as-template", adminOnly, wrap(tpl.templateFromTable));

// /api/table-templates — browsing for everyone, changes for admins
export const tableTemplateRouter = express.Router();
tableTemplateRouter.use(protect);
tableTemplateRouter.get("/", wrap(tpl.listTemplates));
tableTemplateRouter.get("/:id", wrap(tpl.getTemplate));
tableTemplateRouter.post("/", adminOnly, wrap(tpl.createTemplate));
tableTemplateRouter.patch("/:id", adminOnly, wrap(tpl.updateTemplate));
tableTemplateRouter.post("/:id/duplicate", adminOnly, wrap(tpl.duplicateTemplate));

// /api/stored-files — uploads kept with their metadata, downloadable again later
export const storedFileRouter = express.Router();
storedFileRouter.use(protect);
storedFileRouter.post("/", upload.single("file"), wrap(tpl.uploadFile));
storedFileRouter.get("/", wrap(tpl.listFiles));
storedFileRouter.get("/:id", wrap(tpl.getFile));
storedFileRouter.get("/:id/download", wrap(tpl.downloadFile));
