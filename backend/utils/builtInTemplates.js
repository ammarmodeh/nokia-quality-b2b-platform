// Built-in starter templates, derived from the team's own working sheets:
//   Closure Call_Reach (Closure Call).xlsx            → Closure Call · Installation
//   HC Quality Audit (OJO Snags - Installation).xlsx  → OJO Snags · Installation
//   Reach-Faults Quality Audit (OJO Snags - Maint.)   → OJO Snags · Maintenance
//   DVOC · Maintenance mirrors the fields the app stores for DVOC · Installation tasks.
// Served from code (no database rows); editing one saves an editable copy.
const T = (label, type = "text", extra = {}) => ({ label, type, ...extra });
const sel = (label, values, extra = {}) => T(label, "singleSelect", { options: { choices: values.map((v) => (typeof v === "string" ? { value: v } : v)) }, ...extra });
const CHECK = [{ value: "OK", color: "green" }, { value: "NOK", color: "red" }, { value: "Solved", color: "blue" }];
const YESNO = [{ value: "Yes", color: "green" }, { value: "No", color: "red" }];
const check = (label) => sel(label, CHECK, { width: 120 });

const OPERATION = ["New Network Access", "Local Transfer", "D2D--New Network Access", "New Network Access/ZAIN", "New Network Access/WINBACK", "D2D--New Network Access/WINBACK", "New Network Acces/FIBERTECH TO OJO", "Change Customer Segment", "DeWAN LT"];
const ELIGIBILITY = ["NO", "One Becon WIFI 6", "Two Becon WIFI 6", "WIFI6 MODEM", "One Extender", "Two Extenders", "TWO EXT 2G"];
const GOVERNORATES = ["East Amman", "West Amman", "Zarqa", "Jarash", "Madaba", "Mafraq", "Karak", "Maan", "Aqaba", "Tafileh", "Wadi Mousa"];

const SURVEY = [
  "Did the installation team keep the appointment? | هل تم الالتزام بالموعد من قبل فرق التركيب؟",
  "Was the team in uniform with an Orange ID? | هل كان الفريق الفني ملتزم بالزي الرسمي وبطاقة التعريف الخاصة بأورنج؟",
  "Was the modem placed where you asked or advised? | هل تم تركيب مكان المودم بناءً على طلبك أم نصحك فيه الفريق الفني؟",
  "Was Wi-Fi coverage tested in 3 places? | هل تم عمل فحص التغطية في 3 أماكن مختلفة بعيدة عن المودم؟",
  "Did the team run a speed test with you? | هل قام الفريق الفني بفحص السرعة وتسليمك على جهاز الكمبيوتر أو موبايل؟",
  "Were you told about the 2.4 / 5 GHz networks? | هل تم إعلامك بوجود نوعين من الشبكات اللاسلكية لخدمة الفايبر؟",
  "Do you have 5 GHz devices? | هل يتوفر لديك أجهزة تدعم شبكة الـ 5 GHz؟",
  "Was the extender delivered, activated and explained? | هل تم تسليمك وتفعيل موسع الإشارة وشرح آلية عمله؟",
  "Was the old modem handed to the team? | هل تم تسليم المودم القديم إلى الفريق الفني؟",
  "Do you have IPTV devices? | هل لديك أجهزة IPTV مثل الشاشات الذكية أو الريسيفرات؟",
  "Were you given the call-centre number? | إذا عندك أي استفسارات تواصل مع رقم الكول سنتر الموجود على الراوتر",
];

export const BUILT_IN_TEMPLATES = [
  {
    builtInKey: "closure-call-installation",
    name: "Closure Call · Installation",
    description: "Customer call-back after installation: case details, the 11-question survey, team and service scores, follow-up and closure. From “Closure Call_Reach”.",
    issueCategory: "Closure Call",
    issueSubCategory: "Installation",
    fields: [
      T("Customer name", "text", { required: true, width: 220 }),
      T("REQ NO", "text", { validation: { unique: true } }),
      T("INT", "text", { coreMapping: "customerId" }),
      sel("Operation", OPERATION),
      sel("Sales channel", ["RPA", "D2D", "EBU", "E2E Team", "Eshop"]),
      sel("Request status", ["Feasible"]),
      T("Mig2VoIP", "checkbox"),
      sel("CBU/EBU", ["CBU", "EBU", "WS"]),
      sel("Eligible extender", ELIGIBILITY),
      T("Phone 1", "phone"),
      T("New number", "phone"),
      T("Fixed number", "phone"),
      T("Town"),
      T("District"),
      T("Street", "text", { coreMapping: "location" }),
      T("Building"),
      T("Tariff name"),
      sel("Dispatcher", ["SULIMAN", "OSAMA", "KINDA", "OMAR", "ABU-ALHASAN", "ROAA", "ABD-ALAZIZ", "OLA"]),
      T("Region"),
      T("Area"),
      sel("Governorate", GOVERNORATES),
      T("Subcontractor", "text", { defaultValue: "Reach" }),
      T("SP code"),
      T("PIS date", "date", { coreMapping: "date" }),
      sel("Call status", [{ value: "DONE", color: "green" }, { value: "NEED CHECK", color: "amber" }, { value: "CALL BACK", color: "blue" }, { value: "NOT DONE", color: "red" }, { value: "NO ANSWER", color: "gray" }, { value: "REFUSED THE EVALUATION", color: "gray" }]),
      T("Comment", "longText"),
      T("Technician requested closure | هل قام الفني بطلب كلوجر", "checkbox"),
      ...SURVEY.map((q) => sel(q, YESNO, { width: 140 })),
      T("Team score (1–10) | تقييمك للفريق الفني", "number", { validation: { min: 0, max: 10 }, coreMapping: "severity" }),
      T("Service score (1–10) | تقييمك للخدمة", "number", { validation: { min: 0, max: 10 } }),
      T("Action taken by Reach", "longText"),
      sel("Status", [{ value: "Open", color: "amber" }, { value: "Closed", color: "green" }], { coreMapping: "status", defaultValue: "Open" }),
      T("Closed date", "date"),
      T("Team member", "text", { coreMapping: "fieldTeam" }),
    ],
  },
  {
    builtInKey: "ojo-snags-installation",
    name: "OJO Snags · Installation (HC Quality Audit)",
    description: "Mid-quality audit of home connections: customer and site details plus the 30-point installation checklist. From “HC Quality Audit”.",
    issueCategory: "OJO Snags",
    issueSubCategory: "Installation",
    fields: [
      T("SLID/INT No", "text", { required: true, validation: { unique: true }, coreMapping: "customerId" }),
      T("PIS date", "date", { coreMapping: "date" }),
      sel("Operation type", ["New Network Access", "Local Transfer", "New Network Access/WINBACK", "Change Customer Segment", "DeWAN LT"]),
      T("Customer name", "text", { width: 200 }),
      T("Customer contact", "phone"),
      T("Town"),
      T("District"),
      T("Street"),
      T("Building"),
      T("Speed"),
      T("FDB #"),
      sel("HC type", ["1st connection", "OTO", "Configuration", "Not"]),
      sel("Eligibility", ELIGIBILITY),
      T("Location X,Y", "text", { coreMapping: "location" }),
      T("NS", "number"),
      T("SP", "number"),
      ...[
        "2.DB_ Installation", "3.DB_ Label", "4.DB_ Closing", "5.DB_ DF's Label", "6.DB-Cabling system", "7.UG_ Install.",
        "8.DF_ Laying on Poles", "9.DF_ Accessories", "10.DF_ Laying to BEP/OTO", "11.BEP_ Install. & location", "12.BEP_ label (Orange sticker)",
        "13.BEP_ Cabling system", "14.BEP_ DFs label", "15.BEP_ DF Indoor laying", "16.Civil Work (HC) Status Restoration", "17.OTO_ Install.",
        "18.OTO_ label", "19.Modem label", "20.Modem Location", "21.Modem Power level > -23", "22.Modem / Extender Config.", "23.Wi-Fi Coverage",
        "24.(FTTH Offer) speed test", "25.VOIP Active", "26.Indoor, Status Restoration", "27.Clean waste & material", "28.Technicians Skills",
        "29.Technicians Behavior", "30.Technicians Clothes", "31.Technicians Health & Safety",
      ].map(check),
      T("32.Snags solved by OJO", "checkbox", { coreMapping: "status" }),
      T("Overall comment", "longText"),
      T("Action taken by Reach", "longText"),
    ],
  },
  {
    builtInKey: "ojo-snags-maintenance",
    name: "OJO Snags · Maintenance (Faults Quality Audit)",
    description: "Quality audit of fault visits: customer and site details plus the 14-point maintenance checklist. From “Reach-Faults Quality Audit”.",
    issueCategory: "OJO Snags",
    issueSubCategory: "Maintenance",
    fields: [
      T("SLID/INT No.", "text", { required: true, validation: { unique: true }, coreMapping: "customerId" }),
      T("PIS date", "date", { coreMapping: "date" }),
      T("Customer name", "text", { width: 200 }),
      T("Customer contact", "phone"),
      T("Town"),
      T("District"),
      T("Street"),
      T("FDB"),
      T("SE name", "text", { coreMapping: "fieldTeam" }),
      T("Location", "text", { coreMapping: "location" }),
      ...[
        "Closing DB/BEB/OTO", "Constitution", "Cabling system", "Labels/ Orange sticker", "Laying", "Accessories", "Resplicing/Shrink",
        "Location OTO/Modem", "Wi-Fi Coverage", "VOIP Active", "Modem Power level > -25", "Technicians' Behavior & Skills", "(FTTH Offer) speed test",
        "Civil Work/Indoor, Status Restoration",
      ].map(check),
      T("Notes", "longText"),
      T("NOK", "checkbox", { coreMapping: "status" }),
      T("Action taken", "longText"),
    ],
  },
  {
    builtInKey: "dvoc-maintenance",
    name: "DVOC · Maintenance",
    description: "Detractor / neutral survey cases after maintenance visits, with the same fields the app keeps for DVOC · Installation tasks.",
    issueCategory: "DVOC",
    issueSubCategory: "Maintenance",
    fields: [
      T("Customer name", "text", { required: true, width: 200 }),
      T("SLID", "text", { coreMapping: "customerId" }),
      T("Request number", "text", { validation: { unique: true } }),
      T("Contact number", "phone"),
      sel("Governorate", GOVERNORATES),
      T("District", "text", { coreMapping: "location" }),
      T("Interview date", "date", { coreMapping: "date" }),
      T("Evaluation score (0–10)", "number", { validation: { min: 0, max: 10 }, coreMapping: "severity" }),
      T("Customer feedback", "longText"),
      T("Reason"),
      T("Sub-reason"),
      T("Root cause"),
      T("Team accountability"),
      T("Field team", "fieldTeam", { coreMapping: "fieldTeam" }),
      T("Assigned to", "user", { options: { multiple: true }, coreMapping: "assignee" }),
      sel("Priority", [{ value: "High", color: "red" }, { value: "Medium", color: "amber" }, { value: "Normal", color: "blue" }, { value: "Low", color: "gray" }]),
      sel("Status", [{ value: "Todo", color: "gray" }, { value: "In Progress", color: "blue" }, { value: "Closed", color: "green" }, { value: "Completed", color: "violet" }], { coreMapping: "status", defaultValue: "Todo" }),
      T("Notes", "longText"),
    ],
  },
].map((t) => ({ ...t, _id: `builtin:${t.builtInKey}`, source: "built_in", version: 1, sampleRows: [] }));

export const builtInTemplate = (key) => BUILT_IN_TEMPLATES.find((t) => t.builtInKey === key) || null;
