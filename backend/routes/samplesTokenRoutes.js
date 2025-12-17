import express from 'express';
import {
  getSamplesByYear,
  bulkSaveSamples,
  updateSample,
  deleteSample
} from '../controllers/samplesTokenControllers.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Debug middleware for this router
router.use((req, res, next) => {
  console.log(`[samplesTokenRoutes] Entered: ${req.method} ${req.url}`);
  next();
});

// All routes require authentication
router.use(protect);

// GET /api/samples-token/:year - Get all samples for a year
router.get('/:year', (req, res, next) => {
  console.log(`[samplesTokenRoutes] GET /:year hit. Param: ${req.params.year}`);
  getSamplesByYear(req, res, next);
});

// POST /api/samples-token/bulk - Bulk save/update samples
router.post('/bulk', bulkSaveSamples);

// PUT /api/samples-token/:id - Update a single sample
router.put('/:id', updateSample);

// DELETE /api/samples-token/:id - Delete a sample
router.delete('/:id', deleteSample);

export default router;
