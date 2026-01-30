import mongoose from "mongoose";
import dotenv from "dotenv";
import { DropdownOption } from "./models/dropdownOptionModel.js";

dotenv.config();

const cleanupDuplicates = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB for duplicate cleanup...");

        const options = await DropdownOption.find({});
        console.log(`Found ${options.length} total options.`);

        const seen = new Set();
        const duplicates = [];

        for (const opt of options) {
            const key = `${opt.category}:${opt.value}`;
            if (seen.has(key)) {
                duplicates.push(opt._id);
            } else {
                seen.add(key);
            }
        }

        if (duplicates.length > 0) {
            console.log(`Removing ${duplicates.length} duplicate entries...`);
            await DropdownOption.deleteMany({ _id: { $in: duplicates } });
            console.log("Cleanup successful.");
        } else {
            console.log("No duplicates found.");
        }

        // Try to ensure the index now
        console.log("Ensuring unique index { category: 1, value: 1 }...");
        await DropdownOption.collection.createIndex({ category: 1, value: 1 }, { unique: true });
        console.log("Index insured.");

        process.exit(0);
    } catch (error) {
        console.error("Cleanup failed:", error);
        process.exit(1);
    }
};

cleanupDuplicates();
