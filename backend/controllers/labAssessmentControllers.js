import { LabAssessment } from "../models/labAssessmentModel.js";

export const createAssessment = async (req, res) => {
  try {
    const {
      fieldTeamId,
      ontType,
      assessmentType,
      checkpoints,
      comments,
      splicingMachineStatus,
      electrodeLifetime,
      totalScore,
    } = req.body;

    const assessorId = req.user._id;

    const assessment = await LabAssessment.create({
      fieldTeamId,
      assessorId,
      ontType,
      assessmentType,
      checkpoints,
      comments,
      splicingMachineStatus,
      electrodeLifetime,
      totalScore,
    });

    res.status(201).json(assessment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllAssessments = async (req, res) => {
  try {
    const assessments = await LabAssessment.find({})
      .populate("fieldTeamId", "teamName teamCompany")
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
      .populate("fieldTeamId", "teamName teamCompany")
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
      ontType,
      assessmentType,
      checkpoints,
      comments,
      splicingMachineStatus,
      electrodeLifetime,
      totalScore,
    } = req.body;

    const assessment = await LabAssessment.findById(id);

    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found" });
    }

    assessment.fieldTeamId = fieldTeamId || assessment.fieldTeamId;
    assessment.ontType = ontType !== undefined ? ontType : assessment.ontType;
    assessment.assessmentType = assessmentType || assessment.assessmentType;
    assessment.checkpoints = checkpoints || assessment.checkpoints;
    assessment.comments = comments !== undefined ? comments : assessment.comments;
    assessment.splicingMachineStatus = splicingMachineStatus !== undefined ? splicingMachineStatus : assessment.splicingMachineStatus;
    assessment.electrodeLifetime = electrodeLifetime !== undefined ? electrodeLifetime : assessment.electrodeLifetime;
    assessment.totalScore = totalScore !== undefined ? totalScore : assessment.totalScore;

    const updatedAssessment = await assessment.save();
    res.status(200).json(updatedAssessment);
  } catch (error) {
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
    res.status(200).json({ message: "Assessment removed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAssessmentsByTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const assessments = await LabAssessment.find({ fieldTeamId: teamId })
      .populate("fieldTeamId", "teamName teamCompany")
      .populate("assessorId", "name email")
      .populate("ontType", "name")
      .sort({ createdAt: -1 });

    res.status(200).json(assessments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
