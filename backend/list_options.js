import mongoose from "mongoose";
import dotenv from "dotenv";
import { DropdownOption } from "./models/dropdownOptionModel.js";

dotenv.config();

const listOptions = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const options = await DropdownOption.find({
            category: { $in: ["TRANSACTION_TYPE", "TRANSACTION_STATE"] }
        });

        options.forEach(opt => {
            console.log(`CAT:[${opt.category}] VAL:[${opt.value}] LBL:[${opt.label}] ID:${opt._id}`);
        });

        process.exit(0);
    } catch (error) {
        console.error("Listing failed:", error);
        process.exit(1);
    }
};

listOptions();
