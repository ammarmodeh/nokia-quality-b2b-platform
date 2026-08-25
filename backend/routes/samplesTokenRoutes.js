import express from 'express';
import {
  getSamplesByYear,
  bulkSaveSamples,
  updateSample,
  deleteSample,
  getTeamSamplesByYear,
  bulkSaveTeamSamples,
  getDailyOnlineSamplesByYear,
  getAllDailyOnlineSamples,
  bulkSaveDailyOnlineSamples,
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

// Daily Online Samples Routes
// GET /api/samples-token/daily-online/all - Get all daily online samples across all years
router.get('/daily-online/all', getAllDailyOnlineSamples);

// GET /api/samples-token/daily-online/:year - Get all daily online samples for a year
router.get('/daily-online/:year', getDailyOnlineSamplesByYear);

// POST /api/samples-token/daily-online/bulk - Bulk save/update daily online samples
router.post('/daily-online/bulk', bulkSaveDailyOnlineSamples);

// Team Samples Routes
// GET /api/samples-token/team-samples/:year - Get all team samples for a year
router.get('/team-samples/:year', getTeamSamplesByYear);

// POST /api/samples-token/team-samples/bulk - Bulk save/update team samples
router.post('/team-samples/bulk', bulkSaveTeamSamples);

// Weekly & Monthly Samples Routes
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


