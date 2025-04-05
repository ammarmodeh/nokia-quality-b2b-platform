import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { addFavourite, deleteFavourite, getFavourites } from "../controllers/favouriteControllers.js";

const router = express.Router();

router.get("/get-favourites", protect, getFavourites);

router.post("/add-favourite", protect, addFavourite);

router.delete("/delete-favourite/:taskId/:userId", protect, deleteFavourite);

export default router;
