import mongoose from "mongoose";
import dotenv from "dotenv";
import { DropdownOption } from "./models/dropdownOptionModel.js";

dotenv.config();

const listOptions = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const options = await DropdownOption.find({ category: "UNF_REASON_CODE" }).sort({ order: 1 });
        console.log(JSON.stringify(options, null, 2));
        process.exit(0);
    } catch (error) {
        console.error("List failed:", error);
        process.exit(1);
    }
};

listOptions();
