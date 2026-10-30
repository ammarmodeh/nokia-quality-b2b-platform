// RCA rows of a maintenance task, shared by the tasks list, its export and the reports page.

const normalizeArrayField = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val
      .flatMap((v) => (typeof v === "string" ? v.split(",").map((s) => s.trim()) : [v]))
      .map(String)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (typeof val === "string") {
    return val
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [String(val).trim()].filter(Boolean);
};

// Extracts all RCA rows from a task (supporting both `task.rca` objects and legacy string arrays)
export const getTaskRcaRows = (task) => {
  if (Array.isArray(task?.rca) && task.rca.length > 0) {
    return task.rca
      .filter((r) => r.reason || r.subReason || r.rootCause || r.responsible)
      .map((r) => ({
        reason: (r.reason || "Unknown").trim(),
        subReason: (r.subReason || "Unknown").trim(),
        rootCause: (r.rootCause || "Unknown").trim(),
        responsible: (r.responsible || "Unknown").trim(),
        teamAccountability: (r.teamAccountability || "Not specified").trim(),
        // An empty root cause is shown as "Unknown" but is not an identified root cause.
        hasRootCause: Boolean((r.rootCause || "").trim()),
      }));
  }

  const reasons = normalizeArrayField(task?.reason);
  const subReasons = normalizeArrayField(task?.subReason);
  const rootCauses = normalizeArrayField(task?.rootCause);
  const resps = normalizeArrayField(task?.responsible);
  const accs = normalizeArrayField(task?.teamAccountability);
  const max = Math.max(reasons.length, subReasons.length, rootCauses.length, resps.length, accs.length);

  if (max === 0) return [];
  const rows = [];
  for (let i = 0; i < max; i++) {
    rows.push({
      reason: reasons[i] || reasons[0] || "Unknown",
      subReason: subReasons[i] || subReasons[0] || "Unknown",
      rootCause: rootCauses[i] || rootCauses[0] || "Unknown",
      responsible: resps[i] || resps[0] || "Unknown",
      teamAccountability: accs[i] || accs[0] || "Not specified",
      hasRootCause: Boolean(rootCauses[i] || rootCauses[0]),
    });
  }
  return rows;
};
