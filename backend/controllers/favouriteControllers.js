import { FavouriteSchema } from "../models/favouriteModel.js";


// In your backend controller
export const getFavourites = async (req, res) => {
  try {
    const favourites = await FavouriteSchema.find({ userId: req.user._id });
    // Create a Set of originalTaskIds for quick lookup
    const favouriteTaskIds = new Set(favourites.map(fav => fav.originalTaskId.toString()));

    res.json({
      favourites,
      favouriteTaskIds: Array.from(favouriteTaskIds) // Convert Set to array
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export const addFavourite = async (req, res) => {
  const user = req.user;

  try {
    const taskData = { ...req.body.task };
    const originalTaskId = taskData._id;
    const slid = taskData.slid;

    // Check if this user already has this task in favorites
    const existingFavourite = await FavouriteSchema.findOne({
      userId: user._id,
      originalTaskId: originalTaskId
    });

    if (existingFavourite) {
      return res.status(400).json({
        error: "This task is already in your favorites list",
        isAlreadyFavorited: true
      });
    }

    // Clean up taskData before saving to Favourite
    delete taskData._id;
    delete taskData.createdAt;
    delete taskData.updatedAt;
    delete taskData.__v;

    const body = {
      userId: user._id,
      originalTaskId: originalTaskId,
      ...taskData
    };

    const favourite = await FavouriteSchema.create(body);
    res.status(201).json(favourite);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export const deleteFavourite = async (req, res) => {
  try {
    const { taskId, userId } = req.params;

    const deletedFavourite = await FavouriteSchema.findOneAndDelete({ userId, _id: taskId });

    if (!deletedFavourite) {
      return res.status(404).json({ message: "Favourite not found" });
    }

    res.status(200).json({ message: "Favourite deleted successfully", deletedFavourite });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}