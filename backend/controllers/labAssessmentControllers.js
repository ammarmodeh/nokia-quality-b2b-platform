import mongoose from "mongoose";
import { LabAssessment } from "../models/labAssessmentModel.js";
import { FieldTeamsSchema } from "../models/fieldTeamsModel.js";

export const createAssessment = async (req, res) => {
  try {
    const {
      fieldTeamId,
      fieldTeamName,
      conductedBy,
      assessmentDate,
      ontModel,
      ontType,
      experienceYears,
      experienceMonths,
      experienceDays,
      yearsOfExperience,
      employmentType,
      dateOfBirth,
      age,
      certificates,
      assessmentType,
      measuredValues,
      equipmentChecklist,
      sections,
      checkpoints,
      sectionScores,
      comments,
      feedback,
      splicingMachineStatus,
      electrodeLifetime,
      overallScore,
      totalScore,
      status,
    } = req.body;

    const assessorId = req.user._id;
    let resolvedTeamName = fieldTeamName;

    if (!resolvedTeamName && fieldTeamId) {
      const team = await FieldTeamsSchema.findById(fieldTeamId);
      if (team) {
        resolvedTeamName = team.teamName;
      }
    }

    const expY = experienceYears !== undefined ? Number(experienceYears) : (yearsOfExperience !== undefined ? Math.floor(Number(yearsOfExperience)) : 0);
    const expM = experienceMonths !== undefined ? Number(experienceMonths) : (yearsOfExperience !== undefined ? Math.round((Number(yearsOfExperience) % 1) * 12) : 0);
    const expD = experienceDays !== undefined ? Number(experienceDays) : 0;
    const computedTotalYears = Number((expY + (expM / 12) + (expD / 365)).toFixed(2));

    let computedAge = null;
    if (dateOfBirth) {
      const dobDate = new Date(dateOfBirth);
      if (!isNaN(dobDate.getTime())) {
        const ref = assessmentDate ? new Date(assessmentDate) : new Date();
        let a = ref.getFullYear() - dobDate.getFullYear();
        const m = ref.getMonth() - dobDate.getMonth();
        if (m < 0 || (m === 0 && ref.getDate() < dobDate.getDate())) {
          a--;
        }
        computedAge = a >= 0 ? a : 0;
      }
    } else if (age !== undefined && age !== null && age !== "") {
      computedAge = Number(age);
    }

    const assessment = await LabAssessment.create({
      fieldTeamId,
      fieldTeamName: resolvedTeamName,
      assessorId,
      conductedBy: conductedBy || req.user.name,
      assessmentDate: assessmentDate || new Date(),
      ontModel: ontModel || "All Supported Models (ZTE F6600P, Nokia G-2426G-P, Nokia G-140W-H)",
      ontType,
      experienceYears: expY,
      experienceMonths: expM,
      experienceDays: expD,
      yearsOfExperience: computedTotalYears,
      employmentType: employmentType || "Subcontractor",
      dateOfBirth: dateOfBirth || null,
      age: computedAge,
      certificates: certificates || {},
      assessmentType: assessmentType || "E2E FTTH Practical Assessment",
      measuredValues: measuredValues || {},
      equipmentChecklist: equipmentChecklist || [],
      sections: sections || [],
      checkpoints: checkpoints || [],
      sectionScores: sectionScores || {},
      comments: comments || feedback || "",
      feedback: feedback || comments || "",
      splicingMachineStatus: splicingMachineStatus || "Good",
      electrodeLifetime: electrodeLifetime !== undefined ? electrodeLifetime : 0,
      overallScore: overallScore !== undefined ? overallScore : totalScore,
      totalScore: totalScore !== undefined ? totalScore : overallScore,
      status: status || "Completed",
    });

    res.status(201).json(assessment);
  } catch (error) {
    console.error("Error creating lab assessment:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getAllAssessments = async (req, res) => {
  try {
    const assessments = await LabAssessment.find({})
      .populate("fieldTeamId", "teamName teamCompany isBlacklist experienceYears experienceMonths experienceDays yearsOfExperience employmentType certificates dateOfBirth age")
      .populate("assessorId", "name email")
      .populate("ontType", "name")
      .sort({ createdAt: -1 });
    res.status(200).json(assessments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAssessmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const assessment = await LabAssessment.findById(id)
      .populate("fieldTeamId", "teamName teamCompany isBlacklist experienceYears experienceMonths experienceDays yearsOfExperience employmentType certificates dateOfBirth age")
      .populate("assessorId", "name email")
      .populate("ontType", "name");

    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found" });
    }

    res.status(200).json(assessment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      fieldTeamId,
      fieldTeamName,
      conductedBy,
      assessmentDate,
      ontModel,
      ontType,
      experienceYears,
      experienceMonths,
      experienceDays,
      yearsOfExperience,
      employmentType,
      dateOfBirth,
      age,
      certificates,
      assessmentType,
      measuredValues,
      equipmentChecklist,
      sections,
      checkpoints,
      sectionScores,
      comments,
      feedback,
      splicingMachineStatus,
      electrodeLifetime,
      overallScore,
      totalScore,
      status,
    } = req.body;

    const assessment = await LabAssessment.findById(id);

    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found" });
    }

    if (fieldTeamId) assessment.fieldTeamId = fieldTeamId;
    if (fieldTeamName) assessment.fieldTeamName = fieldTeamName;
    if (conductedBy) assessment.conductedBy = conductedBy;
    if (assessmentDate) assessment.assessmentDate = assessmentDate;
    if (ontModel !== undefined) assessment.ontModel = ontModel;
    if (ontType !== undefined) assessment.ontType = ontType;

    if (experienceYears !== undefined || experienceMonths !== undefined || experienceDays !== undefined) {
      const expY = experienceYears !== undefined ? Number(experienceYears) : (assessment.experienceYears || 0);
      const expM = experienceMonths !== undefined ? Number(experienceMonths) : (assessment.experienceMonths || 0);
      const expD = experienceDays !== undefined ? Number(experienceDays) : (assessment.experienceDays || 0);
      assessment.experienceYears = expY;
      assessment.experienceMonths = expM;
      assessment.experienceDays = expD;
      assessment.yearsOfExperience = Number((expY + (expM / 12) + (expD / 365)).toFixed(2));
    } else if (yearsOfExperience !== undefined) {
      const num = Number(yearsOfExperience);
      assessment.experienceYears = Math.floor(num);
      assessment.experienceMonths = Math.round((num % 1) * 12);
      assessment.experienceDays = 0;
      assessment.yearsOfExperience = num;
    }

    if (employmentType !== undefined) assessment.employmentType = employmentType;
    if (dateOfBirth !== undefined) {
      assessment.dateOfBirth = dateOfBirth;
      if (dateOfBirth) {
        const dobDate = new Date(dateOfBirth);
        if (!isNaN(dobDate.getTime())) {
          const ref = assessment.assessmentDate ? new Date(assessment.assessmentDate) : new Date();
          let a = ref.getFullYear() - dobDate.getFullYear();
          const m = ref.getMonth() - dobDate.getMonth();
          if (m < 0 || (m === 0 && ref.getDate() < dobDate.getDate())) {
            a--;
          }
          assessment.age = a >= 0 ? a : 0;
        }
      } else {
        assessment.age = null;
      }
    } else if (age !== undefined) {
      assessment.age = age !== null && age !== "" ? Number(age) : null;
    }

    if (certificates !== undefined) assessment.certificates = certificates;
    if (assessmentType) assessment.assessmentType = assessmentType;
    if (measuredValues) assessment.measuredValues = measuredValues;
    if (equipmentChecklist) assessment.equipmentChecklist = equipmentChecklist;
    if (sections) assessment.sections = sections;
    if (checkpoints) assessment.checkpoints = checkpoints;
    if (sectionScores) assessment.sectionScores = sectionScores;
    if (comments !== undefined) assessment.comments = comments;
    if (feedback !== undefined) assessment.feedback = feedback;
    if (splicingMachineStatus !== undefined) assessment.splicingMachineStatus = splicingMachineStatus;
    if (electrodeLifetime !== undefined) assessment.electrodeLifetime = electrodeLifetime;
    if (overallScore !== undefined) assessment.overallScore = overallScore;
    if (totalScore !== undefined) assessment.totalScore = totalScore;
    if (status) assessment.status = status;

    const updatedAssessment = await assessment.save();
    res.status(200).json(updatedAssessment);
  } catch (error) {
    console.error("Error updating lab assessment:", error);
    res.status(500).json({ message: error.message });
  }
};

export const deleteAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    const assessment = await LabAssessment.findById(id);

    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found" });
    }

    await assessment.deleteOne();
    res.status(200).json({ message: "Assessment permanently deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAssessmentsByTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    let query = {};
    if (mongoose.Types.ObjectId.isValid(teamId)) {
      const team = await FieldTeamsSchema.findById(teamId);
      if (team && team.teamName) {
        const escaped = team.teamName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query = {
          $or: [
            { fieldTeamId: teamId },
            { fieldTeamName: { $regex: new RegExp(`^${escaped}$`, 'i') } }
          ]
        };
      } else {
        query = { fieldTeamId: teamId };
      }
    } else {
      const escaped = String(teamId).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query = { fieldTeamName: { $regex: new RegExp(`^${escaped}$`, 'i') } };
    }

    const assessments = await LabAssessment.find(query)
      .populate("fieldTeamId", "teamName teamCompany isBlacklist experienceYears experienceMonths experienceDays yearsOfExperience employmentType certificates dateOfBirth age")
      .populate("assessorId", "name email")
      .populate("ontType", "name")
      .sort({ createdAt: -1 });

    res.status(200).json(assessments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
