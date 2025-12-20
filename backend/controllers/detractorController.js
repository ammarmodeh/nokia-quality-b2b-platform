import Detractor from "../models/detractorModel.js";
import SamplesToken from "../models/samplesTokenModel.js";

// Upload with fileName support and optional deleteIds for merge
export const uploadDetractors = async (req, res) => {
  try {
    const { data, fileName, deleteIds } = req.body;

    if (!data || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ status: false, message: "No data provided or invalid format." });
    }

    // If deleteIds provided (Smart Merge), delete old records first
    if (deleteIds && Array.isArray(deleteIds) && deleteIds.length > 0) {
      await Detractor.deleteMany({ _id: { $in: deleteIds } });
    }

    // Attach fileName to each record if provided
    const payload = data.map(item => ({
      ...item,
      fileName: fileName || "Unknown File"
    }));

    // Mongoose with strict: false will save all fields provided in 'data'
    const result = await Detractor.insertMany(payload);

    res.status(201).json({
      status: true,
      message: `Successfully uploaded ${result.length} records to ${fileName || 'file'}.`,
      count: result.length,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ status: false, message: "Duplicate entries detected." });
    }
    console.error("Upload error:", error);
    res.status(500).json({ status: false, message: error.message || "Server Error" });
  }
};

// Delete an entire batch by fileName
export const deleteBatch = async (req, res) => {
  try {
    const { fileName } = req.params;
    const decodedFileName = decodeURIComponent(fileName);

    const result = await Detractor.deleteMany({ fileName: decodedFileName });

    if (result.deletedCount === 0) {
      return res.status(404).json({ status: false, message: "Batch not found or already deleted." });
    }

    res.status(200).json({
      status: true,
      message: `Batch '${decodedFileName}' deleted successfully (${result.deletedCount} records).`
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

// Check for duplicates based on 'Request Number' (or similar variations)
export const checkDuplicates = async (req, res) => {
  try {
    const { fileName, newRecords } = req.body;

    if (!fileName || !newRecords || !Array.isArray(newRecords)) {
      return res.status(400).json({ status: false, message: "Invalid payload." });
    }

    // Fetch existing records for this file
    const existingRecords = await Detractor.find({ fileName });

    // Helper to find the Request Number key dynamically
    const findKey = (obj) => {
      if (!obj) return null;
      return Object.keys(obj).find(k => /request.*no/i.test(k));
    };

    // Map existing records
    const existingMap = new Map();
    existingRecords.forEach(doc => {
      // Find key in the doc (mongoose doc needs .toObject() or direct access if strict:false)
      // Mongoose docs usually have keys directly accessible if fetched lean or if strict: false
      const docObj = doc.toObject ? doc.toObject() : doc;
      const key = findKey(docObj);

      if (key) {
        const val = docObj[key];
        if (val) existingMap.set(String(val).trim(), doc); // Store original doc
      }
    });

    const conflicts = [];
    const uniqueRecords = [];

    for (const record of newRecords) {
      const key = findKey(record);
      const newReqNum = key ? record[key] : null;

      if (newReqNum && existingMap.has(String(newReqNum).trim())) {
        conflicts.push({
          existing: existingMap.get(String(newReqNum).trim()),
          new: record
        });
      } else {
        uniqueRecords.push(record);
      }
    }

    res.status(200).json({
      status: true,
      conflicts,
      uniqueCount: uniqueRecords.length,
      conflictCount: conflicts.length
    });

  } catch (error) {
    console.error("Check duplicate error:", error);
    res.status(500).json({ status: false, message: error.message });
  }
};

// Get all unique upload batches (Group by fileName + Date)
export const getUploadHistory = async (req, res) => {
  try {
    const history = await Detractor.aggregate([
      {
        $group: {
          _id: "$fileName",
          uploadDate: { $max: "$uploadDate" },
          count: { $sum: 1 },
          lastId: { $first: "$_id" } // Just for reference
        }
      },
      { $sort: { uploadDate: -1 } }
    ]);
    res.status(200).json({ status: true, data: history });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

// Get records for a specific file/batch
export const getDetractorsByBatch = async (req, res) => {
  try {
    const { fileName } = req.params; // Expect encoded fileName
    const data = await Detractor.find({ fileName }).sort({ createdAt: -1 });
    res.status(200).json({ status: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

// Update a single record
export const updateDetractor = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Detractor.findByIdAndUpdate(id, req.body, { new: true });
    if (!result) return res.status(404).json({ status: false, message: "Record not found" });
    res.status(200).json({ status: true, message: "Updated successfully", data: result });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

// Delete a single record
export const deleteDetractor = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Detractor.findByIdAndDelete(id);
    if (!result) return res.status(404).json({ status: false, message: "Record not found" });
    res.status(200).json({ status: true, message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

// Create a single record manually
export const createDetractor = async (req, res) => {
  try {
    const newItem = new Detractor(req.body);
    await newItem.save();
    res.status(201).json({ status: true, message: "Created successfully", data: newItem });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

// Generic get all
export const getDetractors = async (req, res) => {
  try {
    const data = await Detractor.find().sort({ createdAt: -1 });
    res.status(200).json({ status: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

// Delete a specific column from a batch
export const deleteBatchColumn = async (req, res) => {
  try {
    const { fileName, columnName } = req.params;
    const decodedFileName = decodeURIComponent(fileName);

    const result = await Detractor.updateMany(
      { fileName: decodedFileName },
      { $unset: { [columnName]: "" } }
    );

    res.status(200).json({
      status: true,
      message: `Column '${columnName}' deleted from ${result.modifiedCount} records.`,
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

// Rename a specific column in a batch
export const renameBatchColumn = async (req, res) => {
  try {
    const { fileName, oldColumnName, newColumnName } = req.params;
    const decodedFileName = decodeURIComponent(fileName);

    const result = await Detractor.updateMany(
      { fileName: decodedFileName },
      { $rename: { [oldColumnName]: newColumnName } }
    );

    res.status(200).json({
      status: true,
      message: `Column '${oldColumnName}' renamed to '${newColumnName}' in ${result.modifiedCount} records.`,
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

// ============ ADVANCED ANALYTICS ENDPOINTS ============

// Get comprehensive analytics overview
export const getAnalyticsOverview = async (req, res) => {
  try {
    const { startDate, endDate, teamName, responsible, specificTeam } = req.query;

    // Build filter
    const filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    if (teamName) filter['Team Name'] = teamName;
    if (responsible) filter.Responsible = responsible;
    if (specificTeam) filter['Specific Team'] = specificTeam;

    const totalRecords = await Detractor.countDocuments(filter);

    // Get distribution by responsible
    const responsibleBreakdown = await Detractor.aggregate([
      { $match: filter },
      { $group: { _id: "$Responsible", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get team breakdown
    const teamBreakdown = await Detractor.aggregate([
      { $match: filter },
      { $group: { _id: "$Team Name", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.status(200).json({
      status: true,
      data: {
        totalRecords,
        responsibleBreakdown: responsibleBreakdown.map(r => ({ name: r._id || 'Unassigned', value: r.count })),
        teamBreakdown: teamBreakdown.map(t => ({ name: t._id || 'Unknown', value: t.count }))
      }
    });
  } catch (error) {
    console.error("Analytics overview error:", error);
    res.status(500).json({ status: false, message: error.message });
  }
};

// Get team violation analysis
export const getTeamViolations = async (req, res) => {
  try {
    const { startDate, endDate, specificTeam } = req.query;

    const filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    if (specificTeam) filter['Specific Team'] = specificTeam;

    const teamStats = await Detractor.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$Team Name",
          totalViolations: { $sum: 1 },
          responsibleBreakdown: {
            $push: "$Responsible"
          },
          latestViolation: { $max: "$createdAt" },
          oldestViolation: { $min: "$createdAt" }
        }
      },
      { $sort: { totalViolations: -1 } }
    ]);

    // Process responsible breakdown
    const processedStats = teamStats.map(team => {
      const responsibleCounts = team.responsibleBreakdown.reduce((acc, r) => {
        const key = r || 'Unassigned';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      return {
        teamName: team._id || 'Unknown',
        totalViolations: team.totalViolations,
        responsibleBreakdown: Object.entries(responsibleCounts).map(([name, count]) => ({ name, count })),
        latestViolation: team.latestViolation,
        oldestViolation: team.oldestViolation,
        avgViolationsPerDay: team.totalViolations / Math.max(1, Math.ceil((team.latestViolation - team.oldestViolation) / (1000 * 60 * 60 * 24)))
      };
    });

    res.status(200).json({
      status: true,
      data: processedStats
    });
  } catch (error) {
    console.error("Team violations error:", error);
    res.status(500).json({ status: false, message: error.message });
  }
};

// Get trend analysis
export const getTrendAnalysis = async (req, res) => {
  try {
    const { period = 'daily', startDate, endDate, specificTeam } = req.query;

    const filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    if (specificTeam) filter['Specific Team'] = specificTeam;

    // Determine grouping format based on period
    let dateFormat;
    switch (period) {
      case 'daily':
        dateFormat = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
        break;
      case 'weekly':
        dateFormat = { $dateToString: { format: "%Y-W%V", date: "$createdAt" } };
        break;
      case 'monthly':
        dateFormat = { $dateToString: { format: "%Y-%m", date: "$createdAt" } };
        break;
      default:
        dateFormat = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
    }

    const trends = await Detractor.aggregate([
      { $match: filter },
      {
        $group: {
          _id: dateFormat,
          count: { $sum: 1 },
          teams: { $addToSet: "$Team Name" },
          responsibles: { $addToSet: "$Responsible" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      status: true,
      data: trends.map(t => ({
        date: t._id,
        count: t.count,
        uniqueTeams: t.teams.length,
        uniqueResponsibles: t.responsibles.length
      }))
    });
  } catch (error) {
    console.error("Trend analysis error:", error);
    res.status(500).json({ status: false, message: error.message });
  }
};

// Get root cause analysis
export const getRootCauseAnalysis = async (req, res) => {
  try {
    const { startDate, endDate, teamName, specificTeam, studyColumns, compareBy } = req.query;

    const filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    if (teamName) filter['Team Name'] = teamName;
    if (specificTeam) filter['Specific Team'] = specificTeam;

    // Default fields to analyze if none provided
    const defaultStudyFields = ['Main Reason', 'Sub-Reason', 'Responsible', 'Specific Team'];
    const fieldsToAnalyze = studyColumns ? (Array.isArray(studyColumns) ? studyColumns : [studyColumns]) : defaultStudyFields;

    const records = await Detractor.find(filter).lean();

    if (compareBy) {
      // Cross-tabulation logic: Compare studyColumns against compareBy field
      const comparisonData = {};

      fieldsToAnalyze.forEach(field => {
        comparisonData[field] = {};
        records.forEach(record => {
          const groupVal = String(record[compareBy] || 'N/A');
          const fieldVal = String(record[field] || 'N/A');

          if (!comparisonData[field][groupVal]) {
            comparisonData[field][groupVal] = {};
          }
          comparisonData[field][groupVal][fieldVal] = (comparisonData[field][groupVal][fieldVal] || 0) + 1;
        });
      });

      // Format for frontend (e.g., for stacked bar charts)
      const formattedComparison = Object.entries(comparisonData).map(([field, groups]) => ({
        field,
        compareBy,
        data: Object.entries(groups).map(([groupName, values]) => ({
          groupName,
          ...values
        })),
        allValues: [...new Set(records.map(r => String(r[field] || 'N/A')))]
      }));

      return res.status(200).json({
        status: true,
        isComparison: true,
        data: formattedComparison
      });
    }

    // Standard analysis logic
    const fieldAnalysis = {};
    records.forEach(record => {
      fieldsToAnalyze.forEach(field => {
        if (record[field] !== undefined) {
          if (!fieldAnalysis[field]) fieldAnalysis[field] = {};
          const value = String(record[field] || 'N/A');
          fieldAnalysis[field][value] = (fieldAnalysis[field][value] || 0) + 1;
        }
      });
    });

    const rootCauses = Object.entries(fieldAnalysis).map(([field, values]) => ({
      field,
      topValues: Object.entries(values)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([value, count]) => ({ value, count }))
    }));

    res.status(200).json({
      status: true,
      isComparison: false,
      data: rootCauses
    });
  } catch (error) {
    console.error("Root cause analysis error:", error);
    res.status(500).json({ status: false, message: error.message });
  }
};

// Get fixed RCA stats: Week vs Responsible, Week vs Q1, Week vs Comments, and NPS Density
export const getFixedRCAStats = async (req, res) => {
  try {
    const { startDate, endDate, teamName, specificTeam } = req.query;

    const filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    if (teamName) filter['Team Name'] = teamName;
    if (specificTeam) filter['Specific Team'] = specificTeam;

    // Get all records for analysis
    const records = await Detractor.find(filter).lean();

    // Grouping by ISO Week manually to match SamplesToken logic
    const getWeek = (date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + 4 - (d.getDay() || 7));
      const yearStart = new Date(d.getFullYear(), 0, 1);
      return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    };

    const weekStats = {};
    const years = new Set();

    records.forEach(record => {
      const date = new Date(record.createdAt);
      const year = date.getFullYear();
      const week = getWeek(date);
      const key = `${year}-W${week}`;
      years.add(year);

      if (!weekStats[key]) {
        weekStats[key] = {
          week,
          year,
          responsible: {},
          q1: { detractors: 0, neutrals: 0 },
          comments: 0,
          totalViolations: 0
        };
      }

      const weekObj = weekStats[key];
      weekObj.totalViolations += 1;

      // Week vs Responsible
      const resp = record.Responsible || 'Unassigned';
      weekObj.responsible[resp] = (weekObj.responsible[resp] || 0) + 1;

      // Week vs Q1
      const q1Score = parseInt(record.Q1);
      if (q1Score >= 1 && q1Score <= 6) weekObj.q1.detractors += 1;
      else if (q1Score >= 7 && q1Score <= 8) weekObj.q1.neutrals += 1;

      // Week vs Comments
      const commentKey = Object.keys(record).find(k => /comment|feedback/i.test(k));
      if (commentKey && record[commentKey] && String(record[commentKey]).trim().length > 0) {
        weekObj.comments += 1;
      }
    });

    // Fetch SamplesToken data for NPS density
    const samplesTokens = await SamplesToken.find({ year: { $in: Array.from(years) } }).lean();
    const tokenMap = {};
    samplesTokens.forEach(token => {
      tokenMap[`${token.year}-W${token.weekNumber}`] = token.sampleSize;
    });

    // Format for frontend
    const result = Object.entries(weekStats).sort().map(([key, stat]) => {
      const sampleSize = tokenMap[key] || 0;
      const density = sampleSize > 0 ? (stat.totalViolations / sampleSize) * 100 : 0;

      // Get responsible breakdown for this specific week as an array
      const respData = Object.entries(stat.responsible).map(([name, count]) => ({ name, count }));

      return {
        label: key,
        ...stat,
        sampleSize,
        npsDensity: density.toFixed(2),
        responsibleData: respData
      };
    });

    // Trend Snapshots (Quick Snapshot for Each Part)
    const topTeamsTrend = await Detractor.aggregate([
      { $match: filter },
      { $group: { _id: "$Team Name", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const topReasonsTrend = await Detractor.aggregate([
      { $match: filter },
      { $group: { _id: "$Main Reason", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    res.status(200).json({
      status: true,
      data: result,
      trends: {
        topTeams: topTeamsTrend.map(t => ({ name: t._id || 'Unknown', value: t.count })),
        topReasons: topReasonsTrend.map(r => ({ name: r._id || 'Unknown', value: r.count }))
      }
    });
  } catch (error) {
    console.error("Fixed RCA stats error:", error);
    res.status(500).json({ status: false, message: error.message });
  }
};
