import SamplesToken from '../models/samplesTokenModel.js';
import TeamSamplesToken from '../models/teamSamplesTokenModel.js';

// Get all samples for a specific year
export const getSamplesByYear = async (req, res) => {
  try {
    const { year } = req.params;
    console.log(`🔍 [Backend] Fetching samples for year: ${year}`);

    const samples = await SamplesToken.find({ year: parseInt(year) })
      .sort({ weekNumber: 1 })
      .lean();

    console.log(`📊 [Backend] Found ${samples.length} samples for year ${year}`);
    if (samples.length > 0) {
      console.log(`📝 [Backend] Sample data (first item):`, samples[0]);
    }

    res.status(200).json(samples);
  } catch (error) {
    console.error(`❌ [Backend] Error fetching samples:`, error);
    res.status(500).json({
      message: 'Error fetching samples',
      error: error.message
    });
  }
};

// Bulk save/update samples (upsert multiple weeks)
export const bulkSaveSamples = async (req, res) => {
  try {
    const { samples } = req.body; // Array of sample objects

    if (!Array.isArray(samples) || samples.length === 0) {
      return res.status(400).json({ message: 'Samples array is required' });
    }

    const operations = samples.map(sample => ({
      updateOne: {
        filter: { year: sample.year, weekNumber: sample.weekNumber },
        update: {
          $set: {
            weekRange: sample.weekRange,
            startDate: sample.startDate,
            endDate: sample.endDate,
            sampleSize: sample.sampleSize || 0,
            promoters: sample.promoters || 0,
            detractors: sample.detractors || 0,
            npsRelated: sample.npsRelated || 0,
            itnRelated: sample.itnRelated || 0,
            createdBy: req.user._id,
          }
        },
        upsert: true
      }
    }));

    const result = await SamplesToken.bulkWrite(operations);

    res.status(200).json({
      message: 'Samples saved successfully',
      result
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error saving samples',
      error: error.message
    });
  }
};

// Update a single sample
export const updateSample = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const sample = await SamplesToken.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!sample) {
      return res.status(404).json({ message: 'Sample not found' });
    }

    res.status(200).json(sample);
  } catch (error) {
    res.status(500).json({
      message: 'Error updating sample',
      error: error.message
    });
  }
};

// Delete a sample
export const deleteSample = async (req, res) => {
  try {
    const { id } = req.params;

    const sample = await SamplesToken.findByIdAndDelete(id);

    if (!sample) {
      return res.status(404).json({ message: 'Sample not found' });
    }

    res.status(200).json({ message: 'Sample deleted successfully' });
  } catch (error) {
    res.status(500).json({
      message: 'Error deleting sample',
      error: error.message
    });
  }
};

// Get team samples for a specific year
export const getTeamSamplesByYear = async (req, res) => {
  try {
    const { year } = req.params;
    console.log(`🔍 [Backend] Fetching team samples for year: ${year}`);

    const teamSamples = await TeamSamplesToken.find({ year: parseInt(year) })
      .sort({ month: 1, teamName: 1 });

    res.status(200).json(teamSamples);
  } catch (error) {
    console.error(`❌ [Backend] Error fetching team samples:`, error);
    res.status(500).json({
      message: 'Error fetching team samples',
      error: error.message
    });
  }
};

// Bulk save/update team samples
export const bulkSaveTeamSamples = async (req, res) => {
  try {
    const { samples } = req.body; // Array of team sample objects

    if (!Array.isArray(samples) || samples.length === 0) {
      return res.status(400).json({ message: 'Team samples array is required' });
    }

    const operations = samples.map(sample => ({
      updateOne: {
        filter: {
          year: parseInt(sample.year),
          month: parseInt(sample.month),
          teamName: sample.teamName.trim()
        },
        update: {
          $set: {
            teamId: sample.teamId || undefined,
            sampleSize: parseFloat(sample.sampleSize) || 0,
            createdBy: req.user?._id,
          }
        },
        upsert: true
      }
    }));

    const result = await TeamSamplesToken.bulkWrite(operations);

    res.status(200).json({
      message: 'Team samples saved successfully',
      result
    });
  } catch (error) {
    console.error(`❌ [Backend] Error saving team samples:`, error);
    res.status(500).json({
      message: 'Error saving team samples',
      error: error.message
    });
  }
};

// ── Daily Online Samples ───────────────────────────────────────────────────
import DailyOnlineSamples from '../models/dailyOnlineSamplesModel.js';

// Get daily online samples for a specific year
export const getDailyOnlineSamplesByYear = async (req, res) => {
  try {
    const { year } = req.params;
    console.log(`🔍 [Backend] Fetching daily online samples for year: ${year}`);

    const dailySamples = await DailyOnlineSamples.find({ year: parseInt(year) })
      .sort({ date: 1 });

    res.status(200).json(dailySamples);
  } catch (error) {
    console.error(`❌ [Backend] Error fetching daily online samples:`, error);
    res.status(500).json({
      message: 'Error fetching daily online samples',
      error: error.message
    });
  }
};

// Get all daily online samples
export const getAllDailyOnlineSamples = async (req, res) => {
  try {
    const dailySamples = await DailyOnlineSamples.find({}).sort({ date: 1 });
    res.status(200).json(dailySamples);
  } catch (error) {
    console.error(`❌ [Backend] Error fetching all daily online samples:`, error);
    res.status(500).json({
      message: 'Error fetching all daily online samples',
      error: error.message
    });
  }
};

// Bulk save/update daily online samples
export const bulkSaveDailyOnlineSamples = async (req, res) => {
  try {
    const { samples } = req.body; // Array of daily sample objects: { year, date, month, day, onlineSamples, note }

    if (!Array.isArray(samples) || samples.length === 0) {
      return res.status(400).json({ message: 'Daily samples array is required' });
    }

    const operations = samples.map(sample => ({
      updateOne: {
        filter: {
          year: parseInt(sample.year),
          date: sample.date.trim()
        },
        update: {
          $set: {
            month: parseInt(sample.month),
            day: parseInt(sample.day),
            onlineSamples: parseFloat(sample.onlineSamples) || 0,
            samplesToken: parseFloat(sample.samplesToken) || 0,
            note: sample.note || '',
            createdBy: req.user?._id,
          }
        },
        upsert: true
      }
    }));

    const result = await DailyOnlineSamples.bulkWrite(operations);

    res.status(200).json({
      message: 'Daily online samples saved successfully',
      result
    });
  } catch (error) {
    console.error(`❌ [Backend] Error saving daily online samples:`, error);
    res.status(500).json({
      message: 'Error saving daily online samples',
      error: error.message
    });
  }
};


