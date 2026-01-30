import { UserNote } from "../models/userNoteModel.js";

// @desc    Get all notes for a user
// @route   GET /api/user-notes
// @access  Private
export const getUserNotes = async (req, res) => {
  const { archived } = req.query;
  const isArchived = archived === "true";

  try {
    const notes = await UserNote.find({
      user: req.user._id,
      isArchived: isArchived
    }).sort({
      isPinned: -1,
      updatedAt: -1,
    });
    res.status(200).json(notes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new note
// @route   POST /api/user-notes
// @access  Private
export const createNote = async (req, res) => {
  const { title, content, category, priority, tags, color, isPinned } = req.body;

  if (!title || !content) {
    return res.status(400).json({ message: "Title and content are required" });
  }

  try {
    const note = await UserNote.create({
      user: req.user._id,
      title,
      content,
      category,
      priority,
      tags,
      color,
      isPinned,
    });
    res.status(201).json(note);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a note
// @route   PUT /api/user-notes/:id
// @access  Private
export const updateNote = async (req, res) => {
  try {
    const note = await UserNote.findOne({ _id: req.params.id, user: req.user._id });

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    const updatedNote = await UserNote.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true }
    );

    res.status(200).json(updatedNote);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a note
// @route   DELETE /api/user-notes/:id
// @access  Private
export const deleteNote = async (req, res) => {
  try {
    const note = await UserNote.findOne({ _id: req.params.id, user: req.user._id });

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    await UserNote.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Note removed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle pin status
// @route   PATCH /api/user-notes/:id/pin
// @access  Private
export const togglePin = async (req, res) => {
  try {
    const note = await UserNote.findOne({ _id: req.params.id, user: req.user._id });

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    note.isPinned = !note.isPinned;
    await note.save();

    res.status(200).json(note);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle archive status
// @route   PATCH /api/user-notes/:id/archive
// @access  Private
export const toggleArchive = async (req, res) => {
  try {
    const note = await UserNote.findOne({ _id: req.params.id, user: req.user._id });

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    note.isArchived = !note.isArchived;
    if (note.isArchived) note.isPinned = false; // Unpin if archived
    await note.save();

    res.status(200).json(note);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
