import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import {
  uploadOnlineData,
  listOnlineData,
  deleteOnlineRow,
  deleteOnlineBatch,
  onlineSummary,
} from '../controllers/onlineDataController.js';

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const router = express.Router();
router.use(protect);

// Summary (merged online + samples + issues)
router.get('/summary', wrap(onlineSummary));

// CRUD
router.get('/',              wrap(listOnlineData));
router.post('/upload',       adminOnly, wrap(uploadOnlineData));
router.delete('/batch/:batch', adminOnly, wrap(deleteOnlineBatch));
router.delete('/:id',        adminOnly, wrap(deleteOnlineRow));

export default router;
