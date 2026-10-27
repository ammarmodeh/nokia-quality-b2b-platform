// Team analysis rates that only compare like with like, month by month.
//
// Samples and online volumes are entered per team per month, while DVOC tasks exist for every month.
// Dividing a period's DVOC by whatever samples happen to be entered inflates the rate for teams with
// missing months. So, over the period:
// - DVOC / Sample % = accountable ÷ (samples − non-accountable), using only months that have samples
// - DVOC / Online % = accountable ÷ online, using only months that have online data
// Totals (DVOC, accountable, samples, online) stay cumulative over the whole period; DVOC in months
// without samples is reported separately so missing sample entries are visible.

export const monthKeyOf = (date) => new Date(date).toISOString().slice(0, 7); // UTC "YYYY-MM", as team detail
export const monthKey = (year, month) => `${year}-${String(month).padStart(2, "0")}`;

const pct = (n, d, digits) => (d > 0 ? +((n / d) * 100).toFixed(digits) : null);

/**
 * @param months Map|object monthKey → { accountable, notAccountable, samples, online }
 *               (samples / online undefined or 0 = not entered for that month)
 */
export const matchedRates = (months) => {
  const entries = months instanceof Map ? [...months.values()] : Object.values(months || {});
  const out = {
    dvoc: 0, accountable: 0, samplesToken: 0, onlineTotal: 0,
    dvocMonths: 0, sampleMonths: 0, onlineMonths: 0,
    matchedAccountable: 0, matchedNonAccountable: 0, unmatchedDvoc: 0,
    onlineMatchedAccountable: 0, unmatchedOnlineDvoc: 0,
  };
  for (const m of entries) {
    const acc = m.accountable || 0;
    const non = m.notAccountable || 0;
    const dvoc = acc + non;
    const samples = Number(m.samples) || 0;
    const online = Number(m.online) || 0;
    out.dvoc += dvoc;
    out.accountable += acc;
    out.samplesToken += samples;
    out.onlineTotal += online;
    if (dvoc) out.dvocMonths++;
    if (samples > 0) {
      out.sampleMonths++;
      out.matchedAccountable += acc;
      out.matchedNonAccountable += non;
    } else out.unmatchedDvoc += dvoc;
    if (online > 0) {
      out.onlineMonths++;
      out.onlineMatchedAccountable += acc;
    } else out.unmatchedOnlineDvoc += dvoc;
  }
  out.adjustedSamples = Math.max(0, out.samplesToken - out.matchedNonAccountable);
  out.dvocSamplePct = pct(out.matchedAccountable, out.adjustedSamples, 1);
  out.dvocOnlinePct = pct(out.onlineMatchedAccountable, out.onlineTotal, 2);
  return out;
};
