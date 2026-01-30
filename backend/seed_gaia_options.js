import mongoose from "mongoose";
import dotenv from "dotenv";
import { DropdownOption } from "./models/dropdownOptionModel.js";

dotenv.config();

const GAIA_OPTIONS = [
    // SECTION 7: GAIA MASTER TRACKING

    // Transaction Types (Activity Codes)
    { category: "TRANSACTION_TYPE", value: "MOD", label: "MOD - Modification (Upgrade/Reschedule)", order: 1 },
    { category: "TRANSACTION_TYPE", value: "DMOK", label: "DMOK - Demand OK (Manual Dispatch Approved)", order: 2 },
    { category: "TRANSACTION_TYPE", value: "VAL", label: "VAL - Validation (Phone Call/Remote Check)", order: 3 },
    { category: "TRANSACTION_TYPE", value: "SWO", label: "SWO - Site Work Order (Field Visit/Modem Swap/Install)", order: 4 },
    { category: "TRANSACTION_TYPE", value: "LWO", label: "LWO - Live Work Order (Activation/Linking)", order: 5 },
    { category: "TRANSACTION_TYPE", value: "RWO", label: "RWO - Return Work Order (Re-work/Follow-up)", order: 6 },
    { category: "TRANSACTION_TYPE", value: "PSR", label: "PSR - Post Site Report (Field Report Submission)", order: 7 },
    { category: "TRANSACTION_TYPE", value: "MUTIN", label: "MUTIN - Mutation/Transfer (Account Change)", order: 8 },
    { category: "TRANSACTION_TYPE", value: "DNEn", label: "DNEn - Dunning Enable (Billing/Collections)", order: 9 },

    // Outcome States (Transaction Outcome Codes)
    { category: "TRANSACTION_STATE", value: "FE", label: "FE - Field Execution (On-Site Work Performed)", order: 1 },
    { category: "TRANSACTION_STATE", value: "VA", label: "VA - Valid/Validated/Approved", order: 2 },
    { category: "TRANSACTION_STATE", value: "RE", label: "RE - Returned/Rejected/Re-queued", order: 3 },
    { category: "TRANSACTION_STATE", value: "PS", label: "PS - Pending Schedule/Partially Successful", order: 4 },
    { category: "TRANSACTION_STATE", value: "OP", label: "OP - Open (In Progress)", order: 5 },

    // Unfulfillment Reason Codes (Failure Reason Codes)
    // 100 Series: Customer Requests & Availability
    { category: "UNF_REASON_CODE", value: "101", label: "Callback Requested by Customer", order: 1 },
    { category: "UNF_REASON_CODE", value: "102", label: "Visit Postponed by Customer Request", order: 2 },
    { category: "UNF_REASON_CODE", value: "103", label: "Customer Busy / Requested Later Contact", order: 3 },
    { category: "UNF_REASON_CODE", value: "104", label: "Customer Refused Visit / Cancellation", order: 4 },
    { category: "UNF_REASON_CODE", value: "105", label: "Customer No Show / Absent", order: 5 },
    { category: "UNF_REASON_CODE", value: "106", label: "Customer No Answer / Unreachable (Phone)", order: 6 },
    { category: "UNF_REASON_CODE", value: "107", label: "Phone Switched Off / Out of Coverage", order: 7 },

    // 200 Series: Resolutions & Findings
    { category: "UNF_REASON_CODE", value: "201", label: "No Issue Found / False Alarm", order: 8 },
    { category: "UNF_REASON_CODE", value: "202", label: "Issue Resolved via Phone Call", order: 9 },
    { category: "UNF_REASON_CODE", value: "203", label: "Technical Team Visited & Resolved", order: 10 },
    { category: "UNF_REASON_CODE", value: "204", label: "Scheduled for Site Survey / Inspection", order: 11 },
    { category: "UNF_REASON_CODE", value: "205", label: "Documentation Updated / Completed", order: 12 },
    { category: "UNF_REASON_CODE", value: "206", label: "Issue Resolved Remotely by FMC / Backend", order: 13 },
    { category: "UNF_REASON_CODE", value: "207", label: "Issue Resolved via Central Reconfiguration", order: 14 },
    { category: "UNF_REASON_CODE", value: "208", label: "Visit Success (Problem Fixed On-Site)", order: 15 },

    // 300 Series: Status & Monitoring
    { category: "UNF_REASON_CODE", value: "301", label: "Customer Will Monitor & Report", order: 16 },
    { category: "UNF_REASON_CODE", value: "302", label: "Escalated to Higher Level Support", order: 17 },
    { category: "UNF_REASON_CODE", value: "303", label: "Pending Equipment/Parts Arrival", order: 18 },
    { category: "UNF_REASON_CODE", value: "304", label: "Waiting for Civil Works / Third Party", order: 19 },
    { category: "UNF_REASON_CODE", value: "305", label: "Technical Impediment / Network Issue", order: 20 },
    { category: "UNF_REASON_CODE", value: "306", label: "Pending Customer Reply / Information", order: 21 },

    { category: "UNF_REASON_CODE", value: "001", label: "Reason Specified in Remarks", order: 22 },
    { category: "UNF_REASON_CODE", value: "002", label: "Generic Minor Unfreeze Reason", order: 23 },

    // System Flow Status
    { category: "SYSTEM_FLOW_STATUS", value: "Todo", label: "Todo", order: 1 },
    { category: "SYSTEM_FLOW_STATUS", value: "In Progress", label: "In Progress", order: 2 },
    { category: "SYSTEM_FLOW_STATUS", value: "Closed", label: "Closed", order: 3 }
];

const seedGaiaOptions = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB for GAIA Seeding...");

        for (const opt of GAIA_OPTIONS) {
            await DropdownOption.findOneAndUpdate(
                { category: opt.category, value: opt.value },
                opt,
                { upsert: true, new: true }
            );
        }

        console.log("GAIA Options seeded/updated successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Seeding failed:", error);
        process.exit(1);
    }
};

seedGaiaOptions();
