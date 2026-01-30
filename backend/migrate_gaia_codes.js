import mongoose from "mongoose";
import dotenv from "dotenv";
import { TaskTicket } from "./models/taskTicketModel.js";

dotenv.config();

const mapping = {
    "RES03": "303",
    "RE29": "105",
    "602": "304",
    "615": "205",
    "650": "305",
    "708": "203",
    "721": "305",
    "722": "204",
    "576": "102",
    "578": "102",
    "579": "102",
    "580": "205",
    "888": "304",
    "674": "304",
    "901": "305",
    "CUST_BUSY": "103",
    "715": "103"
};

const migrateGaiaCodes = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB for GAZIA Code Migration...");

        const tickets = await TaskTicket.find({ unfReasonCode: { $exists: true, $ne: "" } });
        console.log(`Found ${tickets.length} tickets with unfulfillment codes.`);

        let updatedCount = 0;
        for (const ticket of tickets) {
            const oldCode = ticket.unfReasonCode;
            if (mapping[oldCode]) {
                ticket.unfReasonCode = mapping[oldCode];
                await ticket.save();
                updatedCount++;
            } else if (!["101", "102", "103", "104", "105", "201", "202", "203", "204", "205", "301", "302", "303", "304", "305", "001", "002"].includes(oldCode)) {
                // If it's an old code but not in our mapping, mark it as '001' (Reason in Remarks)
                console.log(`Unmapped old code found: ${oldCode}. Mapping to 001.`);
                ticket.unfReasonCode = "001";
                await ticket.save();
                updatedCount++;
            }
        }

        console.log(`Updated ${updatedCount} tickets.`);
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
};

migrateGaiaCodes();
