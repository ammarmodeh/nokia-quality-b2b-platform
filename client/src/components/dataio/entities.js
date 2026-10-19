import api from "../../api/api";
import { TAXONOMY, taxonomyOfIssue, taxonomyOfTask } from "../../constants/taxonomy";

// Field definitions drive import mapping, validation, export columns and templates.
// type: text | number | date | enum | yesno | list | taxonomy
// `synonyms` help auto-map messy headers (English + Arabic).
const T = (key, label, type = "text", extra = {}) => ({ key, label, type, ...extra });

const TAXONOMY_VALUES = TAXONOMY.flatMap((t) => (t.subs.length ? t.subs.map((s) => `${t.label} · ${s}`) : [t.label]));

export const ENTITIES = {
  tasks: {
    label: "Tasks (DVOC · Installation)",
    short: "Tasks",
    keys: [{ value: "requestNumber", label: "Request number" }, { value: "slid", label: "SLID" }],
    fetch: async () => {
      const { data } = await api.get("/tasks/get-all-tasks");
      return Array.isArray(data) ? data : data?.tasks || [];
    },
    fields: [
      T("slid", "SLID", "text", { required: true, synonyms: ["slid", "int", "int no", "service id", "subscription number", "رقم الاشتراك"] }),
      T("requestNumber", "Request number", "number", { required: true, synonyms: ["req no", "request no", "request", "req", "order number", "رقم الطلب"] }),
      T("customerName", "Customer name", "text", { synonyms: ["customer", "cust name", "name", "اسم المشترك", "الاسم"] }),
      T("contactNumber", "Contact number", "text", { synonyms: ["phone", "phone 1", "mobile", "contact", "cust cont", "رقم الهاتف"] }),
      T("customerType", "Customer type", "enum", { options: ["CBU", "EBU"], synonyms: ["cbu/ebu", "segment"] }),
      T("governorate", "Governorate", "text", { synonyms: ["governorate", "region", "المحافظة"] }),
      T("district", "District", "text", { synonyms: ["district", "area", "town", "المنطقة"] }),
      T("interviewDate", "Interview date", "date", { synonyms: ["interview date", "survey date", "call date"] }),
      T("pisDate", "PIS date", "date", { synonyms: ["pis date", "pis", "installation date"] }),
      T("evaluationScore", "Evaluation score (1–10)", "number", { synonyms: ["score", "nps score", "evaluation", "تقييم"] }),
      T("customerFeedback", "Customer feedback", "text", { synonyms: ["feedback", "comment", "comments", "verbatim", "ملاحظات"] }),
      T("reason", "Reason", "list", { splitComma: true, synonyms: ["reason", "reasons", "السبب"] }),
      T("subReason", "Sub-reason", "list", { splitComma: true, synonyms: ["sub reason", "sub-reason"] }),
      T("rootCause", "Root cause", "list", { splitComma: true, synonyms: ["root cause", "rc", "r.c"] }),
      T("teamName", "Field team", "text", { synonyms: ["team", "team name", "team member", "field team", "technician", "الفريق"] }),
      T("teamCompany", "Team company", "text", { synonyms: ["company", "subco name", "subcon", "sc. name", "sc name"] }),
      T("priority", "Priority", "enum", { options: ["High", "Medium", "Normal", "Low", "Not specified"] }),
      T("status", "Status", "enum", { options: ["Todo", "In Progress", "Closed", "Completed"], synonyms: ["status", "task status"] }),
      T("operation", "Operation", "text", { synonyms: ["operation", "operation type"] }),
      T("tarrifName", "Tariff", "text", { synonyms: ["tariff", "tariff name", "package", "speed package"] }),
      T("speed", "Speed (Mbps)", "number", { synonyms: ["speed"] }),
      T("ontType", "ONT type", "text", { synonyms: ["ont", "ont type", "modem"] }),
      T("validationStatus", "Validation", "enum", { options: ["Validated", "Not validated", "Not specified"] }),
      T("taxonomy", "Tracker (category · sub-category)", "taxonomy", { options: TAXONOMY_VALUES, synonyms: ["category", "tracker", "issue type"] }),
    ],
    exportValue: { taxonomy: (r) => taxonomyOfTask(r).label },
  },

  snags: {
    label: "OJO Snags & complaints",
    short: "Snags",
    keys: [{ value: "ticketId", label: "Ticket / case number" }, { value: "slid", label: "SLID" }],
    fetch: async () => {
      const { data } = await api.get("/customer-issues", { params: { limit: 10000 } });
      return data?.data || [];
    },
    fields: [
      T("slid", "SLID", "text", { required: true, synonyms: ["slid", "slid/int no", "slid/int no.", "int no", "case_msisdn", "msisdn", "رقم الاشتراك"] }),
      T("ticketId", "Ticket / case number", "text", { synonyms: ["ticket", "ticket id", "case number", "case no"] }),
      T("customerName", "Customer name", "text", { synonyms: ["customer", "cust name", "customer name", "اسم المشترك"] }),
      T("customerContact", "Customer contact", "text", { synonyms: ["cust cont", "contact", "phone", "mobile"] }),
      T("area", "Area", "text", { synonyms: ["area", "town", "district", "location"] }),
      T("fromMain", "Source (main)", "enum", { options: ["Snags", "Complaints"] }),
      T("fromSub", "Source (sub)", "enum", { options: ["Joint Quality", "TCRM", "TRC", "FAT Audit"], synonyms: ["type", "source"] }),
      T("snagType", "Snag type", "enum", { options: ["Installation", "Maintenance"] }),
      T("issueCategories", "Issue categories", "list", { splitComma: true, synonyms: ["issue", "issues", "issue category", "complaint category", "nok"] }),
      T("teamName", "Field team", "text", { synonyms: ["team name", "team", "se name", "technician", "installing team"] }),
      T("teamCompany", "Team company", "text", { synonyms: ["sc. name", "sc name", "subcon", "company"] }),
      T("teamCode", "Team code", "text", { synonyms: ["team code", "team id"] }),
      T("pisDate", "PIS date", "date", { synonyms: ["pis date"] }),
      T("date", "Reported date", "date", { synonyms: ["received date", "reported date", "date"] }),
      T("reporter", "Reporter", "text", { synonyms: ["reporter", "reported by"] }),
      T("reporterNote", "Reporter note / complaint", "text", { synonyms: ["complaint", "notes", "note", "overall comment", "description"] }),
      T("contactMethod", "Contact method", "text", { synonyms: ["contact method", "channel"] }),
      T("dispatched", "Dispatched", "yesno"),
      T("solved", "Resolved", "yesno", { synonyms: ["status", "solved", "resolved", "closed"] }),
      T("resolveDate", "Resolve date", "date", { synonyms: ["closed date", "resolve date", "resolution date"] }),
      T("resolvedBy", "Resolved by", "enum", { options: ["Phone", "Visit"] }),
      T("closedBy", "Supervisor", "text", { synonyms: ["supervisor", "closed by"] }),
      T("resolutionDetails", "Resolution details", "text", { synonyms: ["action taken", "action taken by reach", "resolution", "action"] }),
      T("assignedTo", "Assigned to", "text", { synonyms: ["assigned to", "owner", "responsibility"] }),
      T("taxonomy", "Tracker (category · sub-category)", "taxonomy", { options: TAXONOMY_VALUES, synonyms: ["tracker", "issue type"] }),
    ],
    exportValue: {
      taxonomy: (r) => taxonomyOfIssue(r).label,
      issueCategories: (r) => (r.issues || []).map((i) => i?.category).filter(Boolean).join(", "),
    },
  },

  fieldTeams: {
    label: "Field teams",
    short: "Field teams",
    keys: [{ value: "teamCode", label: "Team code" }],
    fetch: async () => (await api.get("/field-teams/get-field-teams")).data || [],
    fields: [
      T("teamCode", "Team code", "text", { required: true, synonyms: ["team code", "team id", "code", "sp code", "sp"] }),
      T("firstName", "First name", "text", { required: true, synonyms: ["first name", "الاسم الأول"] }),
      T("secondName", "Second name", "text", { synonyms: ["second name", "father name", "اسم الأب"] }),
      T("thirdName", "Third name", "text", { synonyms: ["third name", "grandfather name"] }),
      T("surname", "Surname", "text", { required: true, synonyms: ["surname", "last name", "family name", "العائلة"] }),
      T("teamName", "Team name (full name)", "text", { synonyms: ["team name", "full name", "name"] }),
      T("teamCompany", "Company", "text", { required: true, synonyms: ["company", "subcon", "subco name"] }),
      T("contactNumber", "Contact number", "text", { required: true, synonyms: ["phone", "mobile", "contact"] }),
      T("employmentType", "Employment type", "enum", { options: ["Employee", "Subcontractor"] }),
      T("fsmSerialNumber", "FSM serial", "text", { synonyms: ["fsm", "fsm serial"] }),
      T("laptopSerialNumber", "Laptop serial", "text", { synonyms: ["laptop", "laptop serial"] }),
    ],
  },

  quiz: {
    label: "Quiz questions",
    short: "Questions",
    keys: [{ value: "question", label: "Question text" }],
    fetch: async () => {
      const [p, iq] = await Promise.all([api.get("/quiz/questions", { params: { quizType: "Performance" } }), api.get("/quiz/questions", { params: { quizType: "IQ" } })]);
      return [...(p.data || []), ...(iq.data || [])];
    },
    fields: [
      T("question", "Question", "text", { required: true, synonyms: ["question", "السؤال"] }),
      T("options", "Options (separate with |)", "list", { required: true, synonyms: ["options", "choices", "answers", "الخيارات"] }),
      T("correctAnswer", "Correct answer", "text", { required: true, synonyms: ["correct answer", "answer", "الإجابة"] }),
      T("category", "Category", "text", { synonyms: ["category", "topic"] }),
      T("type", "Type", "enum", { options: ["options", "essay"] }),
      T("quizType", "Quiz type", "enum", { options: ["Performance", "IQ"] }),
      T("guideline", "Guideline", "text", { synonyms: ["guideline", "hint", "explanation"] }),
    ],
  },

  dropdownOptions: {
    label: "Dropdown options",
    short: "Dropdowns",
    keys: [{ value: "value", label: "Value (within list)" }],
    fetch: async () => Object.values((await api.get("/dropdown-options/all")).data || {}).flat(),
    fields: [
      T("category", "List (category key)", "text", { required: true, synonyms: ["category", "list"] }),
      T("value", "Value", "text", { required: true }),
      T("label", "Label", "text", { required: true, synonyms: ["label", "name", "display"] }),
      T("order", "Order", "number"),
      T("parentCategory", "Parent list", "text"),
      T("parentValue", "Parent value", "text", { synonyms: ["parent"] }),
    ],
  },
};

export const ENTITY_KEYS = Object.keys(ENTITIES);
