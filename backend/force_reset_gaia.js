import mongoose from "mongoose";
import dotenv from "dotenv";
import { DropdownOption } from "./models/dropdownOptionModel.js";

dotenv.config();

const GAIA_OPTIONS = [
    // SECTION 7: GAIA MASTER TRACKING

    // Transaction Types (Activity Codes)
    { category: "TRANSACTION_TYPE", value: "MOD", label: "Modification (Upgrade/Reschedule)", order: 1 },
    { category: "TRANSACTION_TYPE", value: "DMOK", label: "Demand OK (Manual Dispatch OK)", order: 2 },
    { category: "TRANSACTION_TYPE", value: "VAL", label: "Validate / Validation", order: 3 },
    { category: "TRANSACTION_TYPE", value: "SWO", label: "Site Work Order (Modem Swap/Install)", order: 4 },
    { category: "TRANSACTION_TYPE", value: "LWO", label: "Live Work Order (Linking to Activation)", order: 5 },
    { category: "TRANSACTION_TYPE", value: "RWO", label: "Return / Re-work Order", order: 6 },
    { category: "TRANSACTION_TYPE", value: "PSR", label: "Post Site Report (Submission)", order: 7 },
    { category: "TRANSACTION_TYPE", value: "MUTIN", label: "Mutation / Transfer", order: 8 },
    { category: "TRANSACTION_TYPE", value: "DNEn", label: "Dunning Enable (Billing/Collections)", order: 9 },

    // Outcome States (Transaction Outcome Codes)
    { category: "TRANSACTION_STATE", value: "FE", label: "Failed / Front-End Rejection / Fault", order: 1 },
    { category: "TRANSACTION_STATE", value: "VA", label: "Valid / Validated / Approved", order: 2 },
    { category: "TRANSACTION_STATE", value: "RE", label: "Returned / Rejected / Re-queue", order: 3 },
    { category: "TRANSACTION_STATE", value: "PS", label: "Pending Schedule / Partially Successful", order: 4 },
    { category: "TRANSACTION_STATE", value: "OP", label: "Open", order: 5 },

    // Unfulfillment Reason Codes (Failure Reason Codes)
    // 100 Series: Customer Requests & Availability
    { category: "UNF_REASON_CODE", value: "101", label: "Callback Requested by Customer", order: 1 },
    { category: "UNF_REASON_CODE", value: "102", label: "Visit Postponed by Customer Request", order: 2 },
    { category: "UNF_REASON_CODE", value: "103", label: "Customer Busy / Requested Later Contact", order: 3 },
    { category: "UNF_REASON_CODE", value: "104", label: "Customer Refused Visit / Cancellation", order: 4 },
    { category: "UNF_REASON_CODE", value: "105", label: "Customer No Show / Absent", order: 5 },

    // 200 Series: Resolutions & Findings
    { category: "UNF_REASON_CODE", value: "201", label: "No Issue Found / False Alarm", order: 6 },
    { category: "UNF_REASON_CODE", value: "202", label: "Issue Resolved via Phone Call", order: 7 },
    { category: "UNF_REASON_CODE", value: "203", label: "Technical Team Visited & Resolved", order: 8 },
    { category: "UNF_REASON_CODE", value: "204", label: "Scheduled for Site Survey / Inspection", order: 9 },
    { category: "UNF_REASON_CODE", value: "205", label: "Documentation Updated / Completed", order: 10 },

    // 300 Series: Status & Monitoring
    { category: "UNF_REASON_CODE", value: "301", label: "Customer Will Monitor & Report", order: 11 },
    { category: "UNF_REASON_CODE", value: "302", label: "Escalated to Higher Level Support", order: 12 },
    { category: "UNF_REASON_CODE", value: "303", label: "Pending Equipment/Parts Arrival", order: 13 },
    { category: "UNF_REASON_CODE", value: "304", label: "Waiting for Civil Works / Third Party", order: 14 },
    { category: "UNF_REASON_CODE", value: "305", label: "Technical Impediment / Network Issue", order: 15 },

    { category: "UNF_REASON_CODE", value: "001", label: "Reason Specified in Remarks", order: 16 },
    { category: "UNF_REASON_CODE", value: "002", label: "Generic Minor Unfreeze Reason", order: 17 },

    // System Flow Status
    { category: "SYSTEM_FLOW_STATUS", value: "Todo", label: "Todo", order: 1 },
    { category: "SYSTEM_FLOW_STATUS", value: "In Progress", label: "In Progress", order: 2 },
    { category: "SYSTEM_FLOW_STATUS", value: "Closed", label: "Closed", order: 3 }
];

const forceResetGaiaOptions = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB for FORCE RESET...");

        const categoriesToRemove = ["TRANSACTION_TYPE", "TRANSACTION_STATE", "UNF_REASON_CODE", "SYSTEM_FLOW_STATUS"];

        console.log(`Removing all entries for categories: ${categoriesToRemove.join(", ")}`);
        const deleteResult = await DropdownOption.deleteMany({ category: { $in: categoriesToRemove } });
        console.log(`Deleted ${deleteResult.deletedCount} old entries.`);

        console.log("Seeding fresh GAIA options...");
        await DropdownOption.insertMany(GAIA_OPTIONS);
        console.log("Seeding successful!");

        // Ensure index
        console.log("Re-ensuring unique index...");
        await DropdownOption.collection.createIndex({ category: 1, value: 1 }, { unique: true });
        console.log("Unique index enforced.");

        process.exit(0);
    } catch (error) {
        console.error("Force reset failed:", error);
        process.exit(1);
    }
};

forceResetGaiaOptions();
