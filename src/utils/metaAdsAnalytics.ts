export interface MinimalMetaAdsData {
  cohortCustomers: string;
  roas: string;  // lower than 6, e.g. "4.8" or "5.2x"
  ctr: string;   // lower than 3, e.g. "2.4%"
  cpm: string;   // strictly under 250 INR, e.g. "₹180"
  cvr: string;   // lower than 6%, e.g. "4.2%"
  roasRaw: number;
  ctrRaw: number;
  cpmRaw: number;
  cvrRaw: number;
}

/**
 * Returns distinct, randomized Meta Ads performance stats per creative:
 * - ROAS: lower than 6 (e.g. 3.8x - 5.6x)
 * - CTR: lower than 3% (e.g. 1.6% - 2.8%)
 * - CPM: strictly under 250 INR (e.g. ₹120 - ₹240)
 * - CVR: lower than 6% (e.g. 3.2% - 5.4%)
 * Strictly based on 60,000 customers.
 */
export function getMinimalMetaAdsData(
  projectId: string,
  projectTitle: string,
  projectIndex: string = ''
): MinimalMetaAdsData {
  let hash = 0;
  const str = `${projectId}_${projectTitle}_${projectIndex}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const seed = Math.abs(hash);

  // ROAS lower than 6 (range: 3.7 to 5.7)
  const roasNum = (3.7 + ((seed % 21) / 10)).toFixed(1);

  // CTR lower than 3 (range: 1.5% to 2.8%)
  const ctrNum = (1.5 + ((seed % 14) / 10)).toFixed(1);

  // CPM strictly under 250 INR (range: ₹120 to ₹240 INR)
  const cpmNum = 120 + (seed % 13) * 10;

  // CVR lower than 6% (range: 2.8% to 5.4%)
  const cvrNum = (2.8 + ((seed % 27) / 10)).toFixed(1);

  return {
    cohortCustomers: '60,000',
    roas: `${roasNum}x`,
    ctr: `${ctrNum}%`,
    cpm: `₹${cpmNum}`,
    cvr: `${cvrNum}%`,
    roasRaw: parseFloat(roasNum),
    ctrRaw: parseFloat(ctrNum),
    cpmRaw: cpmNum,
    cvrRaw: parseFloat(cvrNum),
  };
}
