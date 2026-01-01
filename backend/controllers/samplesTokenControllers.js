import SamplesToken from '../models/samplesTokenModel.js';

// Get all samples for a specific year
export const getSamplesByYear = async (req, res) => {
  try {
    const { year } = req.params;
    console.log(`🔍 [Backend] Fetching samples for year: ${year}`);

    const samples = await SamplesToken.find({ year: parseInt(year) })
      .sort({ weekNumber: 1 });

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
