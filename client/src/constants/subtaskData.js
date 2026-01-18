export const predefinedSubtasks = {
  original: [
    {
      title: "Task Reception",
      note: "",
      shortNote: "",
      progress: 0,
      status: "Open",
    },
    {
      title: "Customer Contact and Appointment Scheduling",
      note: "",
      progress: 0,
      status: "Open",
    },
    {
      title: "On-Site Problem Resolution",
      note: "",
      progress: 0,
      status: "Open",
    },
    {
      title: "Task Closure for Declined Visits",
      note: "",
      progress: 0,
      status: "Open",
    },
  ],
  visit: [
    {
      title: "Task Reception",
      note: "",
      shortNote: "",
      progress: 0,
      status: "Open",
    },
    {
      title: "Service Installation Evaluation",
      status: "Open",
      checkpoints: [
        {
          name: "ONT Placement Verification",
          checked: false,
          score: null,
          options: {
            type: "conditional",
            question: "How was the ONT placement handled?",
            choices: [
              { label: "Select an option", value: null },
              { label: "Incorrect", value: "incorrect" },
              { label: "Acceptable", value: "acceptable" },
              { label: "Optimal", value: "optimal" }
            ],
            selected: null,
            actionTaken: {
              question: "Corrective actions for ONT placement:",
              choices: [
                { label: "Select an action", value: null },
                { label: "Relocated ONT to proper position", value: "shift_ont" },
                { label: "ONT placed at a suboptimal location due to internal conduit blockage preventing access to the optimal position.", value: "internal_conduit_blocked" },
                { label: "ONT installed in non-standard location based on customer's preference", value: "customer_preference" },
                { label: "Reported to technical team for ONT relocation", value: "report_dispatcher" },
                { label: "No corrective action", value: "no_action" }
              ],
              selected: null
            }
          }
        },
        {
          name: "ONT Configuration Check",
          checked: false,
          score: null,
          options: {
            type: "conditional",
            question: "ONT configuration status:",
            choices: [
              { label: "Select an option", value: null },
              { label: "Incorrect", value: "incorrect" },
              { label: "Partially Correct", value: "partial" },
              { label: "Fully Correct", value: "correct" },
            ],
            selected: null,
            actionTaken: {
              question: "Corrective actions for ONT configuration:",
              choices: [
                { label: "Select an action", value: null },
                { label: "Adjusted ONT settings", value: "reconfigure_ont" },
                { label: "No corrective action", value: "no_action" },
              ],
              selected: null,
            },
          },
        },
        {
          name: "Wi-Fi Repeater Setup",
          checked: false,
          score: null,
          options: {
            type: "conditional",
            question: "Customer Wi-Fi repeater status:",
            choices: [
              { label: "Select an option", value: null },
              { label: "Active and functioning properly", value: "yes_working" },
              { label: "Available but not in use", value: "yes_not_needed" },
              { label: "Not present", value: "no" },
            ],
            selected: null,
            followUpQuestion: {
              question: "Repeater placement quality:",
              choices: [
                { label: "Select an option", value: null },
                { label: "Incorrect", value: "incorrect" },
                { label: "Acceptable", value: "acceptable" },
                { label: "Optimal", value: "optimal" },
              ],
              selected: null,
              actionTaken: {
                question: "Corrective actions for repeater placement:",
                choices: [
                  { label: "Repositioned repeater", value: "relocate_repeater" },
                  { label: "No corrective action", value: "no_action" }
                ],
                selected: null
              },
            },
          },
        },
        {
          name: "Connection Speed Test",
          checked: false,
          score: null,
          options: {
            type: "conditional",
            question: "Speed test results:",
            choices: [
              { label: "Select an option", value: null },
              { label: "Below expected", value: "low" },
              { label: "Meets expectations", value: "ok" },
              { label: "Exceeds expectations", value: "high" }
            ],
            selected: null,
            actionTaken: {
              question: "Corrective actions for speed issues:",
              choices: [
                { label: "Select an action", value: null },
                { label: "Optimized network configuration", value: "optimize_settings" },
                { label: "Performed ONT reset", value: "reset_ont" },
                { label: "Performed repeater reset", value: "reset_repeater" },
                { label: "No corrective action", value: "no_action" }
              ],
              selected: null,
              justification: {
                question: "Reason for not taking corrective action:",
                showWhen: "no_action",
                choices: [
                  { label: "Select justification", value: null },
                  { label: "Device limitations (old hardware)", value: "device_limitations" },
                  { label: "Customer WiFi environment issues", value: "wifi_environment" },
                  { label: "Speed meets contracted service level", value: "meets_contract" },
                  { label: "Temporary network congestion", value: "temp_congestion" },
                  { label: "Application-specific limitation", value: "app_limitation" },
                  { label: "Customer declined service improvements", value: "customer_declined" }
                ],
                selected: null,
                notes: {
                  question: "Additional notes about the situation:",
                  value: ""
                }
              }
            },
            generalJustification: {
              question: "Technical assessment notes:",
              choices: [
                { label: "Select assessment", value: null },
                { label: "Normal speed variation observed", value: "normal_variation" },
                { label: "Speed limited by device capabilities", value: "device_limit" },
                { label: "Speed limited by WiFi technology", value: "wifi_limit" },
                { label: "Speed matches service plan", value: "matches_plan" },
                { label: "No technical issues found", value: "no_issues" }
              ],
              selected: null,
              notes: {
                question: "Technical observations:",
                value: ""
              }
            }
          }
        },
        {
          name: "Wi-Fi Coverage Assessment",
          checked: false,
          score: null,
          options: {
            type: "conditional",
            question: "Wi-Fi signal strength evaluation:",
            choices: [
              { label: "Select an option", value: null },
              { label: "Weak", value: "weak" },
              { label: "Adequate", value: "average" },
              { label: "Strong", value: "strong" },
            ],
            selected: null,
            actionTaken: {
              question: "Corrective actions for coverage issues:",
              choices: [
                { label: "Select an action", value: null },
                { label: "Recommended new repeater purchase", value: "advise_buy_repeater" },
                { label: "Repositioned existing repeater", value: "relocate_repeater" },
                { label: "No corrective action", value: "no_action" },
              ],
              selected: null,
            },
          },
        },
        {
          name: "Optical Signal Quality Check",
          checked: false,
          score: null,
          options: {
            type: "conditional",
            question: "Optical signal quality:",
            choices: [
              { label: "Select an option", value: null },
              { label: "Low power", value: "low_power" },
              { label: "Standard", value: "standard" },
              { label: "High power", value: "high_power" },
            ],
            selected: null,
            actionTaken: {
              question: "Corrective actions for signal issues:",
              choices: [
                { label: "Select an action", value: null },
                { label: "Adjusted optical connection", value: "adjust_connection" },
                { label: "Replaced optical cable", value: "replace_cable" },
                { label: "Identified weak signal from FDB", value: "weak_signal" },
                { label: "Identified ONT malfunction", value: "ont_malfunction" },
                { label: "Reported to technical team", value: "report_technical" },
                { label: "No corrective action", value: "no_action" },
              ],
              selected: null,
            },
          },
          signalTestNotes: "",
        },
      ],
      note: "",
      dateTime: null,
    },
    {
      title: "Customer Technical Education",
      status: "Open",
      checkpoints: [
        {
          name: "Wi-Fi Frequency Explanation (2.4GHz vs 5GHz)",
          checked: false,
          score: null,
          options: {
            type: "conditional",
            question: "Frequency band explanation provided:",
            choices: [
              { label: "Select an option", value: null },
              { label: "Not provided", value: "none" },
              { label: "Basic information", value: "basic" },
              { label: "Comprehensive explanation", value: "detailed" },
            ],
            selected: null,
            actionTaken: {
              question: "Follow-up actions for frequency explanation:",
              choices: [
                { label: "Select an action", value: null },
                { label: "Provided supplemental explanation", value: "provide_explanation" },
                { label: "No follow-up action", value: "no_action" },
              ],
              selected: null,
            },
          },
        },
        {
          name: "Wi-Fi Optimization Guidance",
          checked: false,
          score: null,
          options: {
            type: "conditional",
            question: "Optimization guidance provided:",
            choices: [
              { label: "Select an option", value: null },
              { label: "Not provided", value: "none" },
              { label: "Minimal guidance", value: "minimal" },
              { label: "Complete guidance", value: "complete" },
            ],
            selected: null,
            actionTaken: {
              question: "Follow-up actions for optimization guidance:",
              choices: [
                { label: "Select an action", value: null },
                { label: "Provided additional recommendations", value: "provide_guidance" },
                { label: "No follow-up action", value: "no_action" },
              ],
              selected: null,
            },
          },
        },
        {
          name: "Internet-Based Applications (e.g., IPTV, VPN, ....)",
          checked: false,
          score: null,
          options: {
            type: "conditional",
            question: "Did the customer mention using any internet-based applications?",
            choices: [
              { label: "Select an option", value: null },
              { label: "Not using any", value: "not_using" },
              { label: "Not discussed", value: "not_discussed" },
              { label: "Partially discussed", value: "partial" },
              { label: "Fully explained with usage guidance", value: "explained" }
            ],
            selected: null,
            actionTaken: {
              question: "What action was taken regarding internet-based applications?",
              choices: [
                { label: "Select an action", value: null },
                { label: "Shared common limitations and tips (e.g., VPN speed impact)", value: "share_tips" },
                { label: "Customer confirmed no use of such applications", value: "not_applicable" },
                { label: "No follow-up action needed", value: "no_action" }
              ],
              selected: null
            }
          }
        },
      ],
      note: "",
      dateTime: null,
    },
    {
      title: "Service Feedback Collection",
      status: "Open",
      checkpoints: [
        {
          name: "Service Rating Instructions",
          checked: false,
          score: null,
          options: {
            type: "conditional",
            question: "Rating instructions clarity:",
            choices: [
              { label: "Select an option", value: null },
              { label: "Not provided", value: "not_delivered" },
              { label: "Unclear or incomplete", value: "incomplete_unclear" },
              { label: "Clear and complete", value: "clear_and_complete" },
            ],
            selected: null,
          },
        },
        {
          name: "Technician Professionalism Evaluation",
          checked: false,
          score: null,
          options: {
            type: "conditional",
            question: "Technician conduct assessment:",
            choices: [
              { label: "Select an option", value: null },
              { label: "Unprofessional behavior", value: "unacceptable_conduct" },
              { label: "Standard professionalism", value: "standard" },
              { label: "Exemplary professionalism", value: "professional" },
            ],
            selected: null,
            actionTaken: {
              question: "Actions regarding technician behavior:",
              choices: [
                { label: "Select an action", value: null },
                { label: "Escalated to management", value: "report_manager" },
                { label: "No action taken", value: "no_action" },
              ],
              selected: null,
            },
          },
        },
        {
          name: "Service Execution Pace",
          checked: false,
          score: null,
          options: {
            type: "conditional",
            question: "Perceived service pace:",
            choices: [
              { label: "Select an option", value: null },
              { label: "Rushed service", value: "rushed_service" },
              { label: "Appropriate pace", value: "appropriate_pace" },
            ],
            selected: null,
            actionTaken: {
              question: "Actions regarding service pace:",
              choices: [
                { label: "Select an action", value: null },
                { label: "Escalated to management", value: "report_manager" },
                { label: "No action taken", value: "no_action" },
              ],
              selected: null,
            },
          },
        },
        {
          name: "Post-Service Follow-Up Instructions",
          checked: false,
          score: null,
          options: {
            type: "conditional",
            simpleQuestion: true,
            question: "Follow-up instructions provided:",
            choices: [
              { label: "Select an option", value: null },
              { label: "Yes", value: "yes" },
              { label: "No", value: "no" },
            ],
            selected: null,
            // Added actionTaken for consistency if needed, but it was simple question
          },
        },
      ],
      note: "",
      dateTime: null,
    },
  ],
  phone: [
    {
      title: "Task Reception",
      note: "",
      shortNote: "",
      progress: 0,
      status: "Open",
    },
    {
      title: "Remote Service Assessment",
      status: "Open",
      optional: true,
      checkpoints: [
        {
          name: "Wi-Fi Coverage Evaluation",
          checked: false,
          score: null,
          options: {
            type: "conditional",
            question: "Reported Wi-Fi coverage:",
            choices: [
              { label: "Select an option", value: null },
              { label: "Weak", value: "weak" },
              { label: "Adequate", value: "average" },
              { label: "Strong", value: "strong" },
            ],
            selected: null,
            actionTaken: {
              question: "Remote support actions:",
              choices: [
                { label: "Select an action", value: null },
                { label: "Recommended repeater purchase", value: "advise_buy_repeater" },
                { label: "No action taken", value: "no_action" },
              ],
              selected: null,
            },
          },
        },
        {
          name: "Reported Speed Verification",
          checked: false,
          score: null,
          options: {
            type: "conditional",
            question: "Customer-reported speed:",
            choices: [
              { label: "Select an option", value: null },
              { label: "Below expected", value: "low" },
              { label: "Meets expectations", value: "ok" },
              { label: "Exceeds expectations", value: "high" },
            ],
            selected: null,
            actionTaken: {
              question: "Remote troubleshooting actions:",
              choices: [
                { label: "Select an action", value: null },
                { label: "Explained frequency band differences", value: "explain_band_diff" },
                { label: "Demonstrated optimal speed near ONT", value: "demo_near_ont" },
                { label: "Identified device limitations", value: "identify_device_limit" },
                { label: "No action taken", value: "no_action" },
              ],
              selected: null,
            },
          },
        },
        {
          name: "Wi-Fi Frequency Explanation (2.4GHz vs 5GHz)",
          checked: false,
          score: null,
          options: {
            type: "conditional",
            question: "Frequency explanation provided:",
            choices: [
              { label: "Select an option", value: null },
              { label: "Not provided", value: "none" },
              { label: "Basic information", value: "basic" },
              { label: "Comprehensive explanation", value: "detailed" },
            ],
            selected: null,
            actionTaken: {
              question: "Follow-up explanations:",
              choices: [
                { label: "Select an action", value: null },
                { label: "Provided additional clarification", value: "provide_explanation" },
                { label: "No follow-up action", value: "no_action" },
              ],
              selected: null,
            },
          },
        },
        {
          name: "Internet-Based Applications (e.g., IPTV, VPN, ....)",
          checked: false,
          score: null,
          options: {
            type: "conditional",
            question: "Did the customer mention using any internet-based applications?",
            choices: [
              { label: "Select an option", value: null },
              { label: "Not using any", value: "not_using" },
              { label: "Not discussed", value: "not_discussed" },
              { label: "Partially discussed", value: "partial" },
              { label: "Fully explained with usage guidance", value: "explained" }
            ],
            selected: null,
            actionTaken: {
              question: "What action was taken regarding internet-based applications?",
              choices: [
                { label: "Select an action", value: null },
                { label: "Shared common limitations and tips (e.g., VPN speed impact)", value: "share_tips" },
                { label: "Customer confirmed no use of such applications", value: "not_applicable" },
                { label: "No follow-up action needed", value: "no_action" }
              ],
              selected: null
            }
          }
        },
        {
          name: "Service Rating Instructions",
          checked: false,
          score: null,
          options: {
            type: "conditional",
            question: "Rating instructions clarity:",
            choices: [
              { label: "Select an option", value: null },
              { label: "Not provided", value: "not_delivered" },
              { label: "Unclear or incomplete", value: "incomplete_unclear" },
              { label: "Clear and complete", value: "clear_and_complete" },
            ],
            selected: null,
          },
        },
        {
          name: "Post-Service Follow-Up Instructions",
          checked: false,
          score: null,
          options: {
            type: "conditional",
            question: "Follow-up instructions provided:",
            choices: [
              { label: "Select an option", value: null },
              { label: "Yes", value: "yes" },
              { label: "No", value: "no" },
            ],
            selected: null,
          },
        },
      ],
      note: "",
      dateTime: null,
    },
  ],
  others: [
    {
      title: "Task Reception",
      note: "",
      shortNote: "",
      progress: 0,
      status: "Open",
    },
    {
      title: "Alternative Resolution Methods",
      status: "Open",
      optional: true,
      checkpoints: [
        {
          name: "Resolution Category",
          checked: false,
          options: {
            type: "conditional",
            question: "Select resolution type:",
            choices: [
              { label: "Select an option", value: null },
              { label: "No response from customer", value: "no_answer" },
              { label: "Visit declined by customer", value: "customer_refuse" },
              { label: "Service cancellation initiated", value: "customer_cancel" },
              { label: "Incorrect contact details", value: "wrong_info" },
              { label: "Issue belongs to others", value: "others" },
            ],
            selected: null
          }
        },
        {
          name: "Resolution Details",
          checked: false,
          options: {
            type: "text",
            question: "Additional resolution notes:",
            value: ""
          }
        }
      ]
    }
  ]
};

export const statusConfig = {
  Todo: { color: "bg-yellow-100 text-yellow-800" },
  "In Progress": { color: "bg-blue-100 text-blue-800" },
  Closed: { color: "bg-green-100 text-green-800" },
  Cancelled: { color: "bg-[#2d2d2d] text-gray-300" },
};
