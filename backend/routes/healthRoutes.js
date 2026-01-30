import express from "express";
import mongoose from "mongoose";

const router = express.Router();

router.get("/", async (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1 ? "Connected" : "Disconnected";

    res.status(200).json({
        status: "OK",
        timestamp: new Date().toISOString(),
        database: {
            status: dbStatus,
            readyState: mongoose.connection.readyState
        },
        environment: process.env.NODE_ENV
    });
});

export default router;
