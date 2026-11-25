import type { Claim } from "./claims";
import type { ExecFn, ExecResult, Verdict } from "./runner";

export interface PriorEvidence {
  id: string;
  result: Verdict;
  score: number;
  text: string;
}

const HELPER = "python3 /home/sprite/pinecone.py";
const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64");

/** The text embedded for a claim: its id plus both test commands. */
export function claimText(claim: Claim): string {
  return `${claim.id}\nnegative: ${claim.negative}\npositive: ${claim.positive}`;
}

function requireOk(result: ExecResult, op: string): void {
  if (result.exit !== 0) {
    throw new Error(
      `${op} failed (exit ${result.exit}): ${result.stderr.trim() || result.stdout.trim()}`,
    );
  }
}

/** Store one claim's verdict as a vector in Pinecone, via the Sprite helper. */
export async function storeEvidence(
  exec: ExecFn,
  claimId: string,
  text: string,
  result: Verdict,
  snippet: string,
): Promise<void> {
  const res = await exec(
    `${HELPER} store --id ${claimId} --text-b64 ${b64(text)} --result ${result} --snippet-b64 ${b64(snippet)}`,
  );
  requireOk(res, `store evidence for ${claimId}`);
}

/** Recall the previously stored verdict for a claim, or null when none exists. */
export async function recallEvidence(exec: ExecFn, text: string): Promise<PriorEvidence | null> {
  const res = await exec(`${HELPER} recall --text-b64 ${b64(text)}`);
  requireOk(res, "recall evidence");
  let parsed: unknown;
  try {
    parsed = JSON.parse(res.stdout);
  } catch {
    throw new Error(`recall evidence: unparseable helper output: ${res.stdout.trim()}`);
  }
  const match = (parsed as { match?: unknown }).match;
  if (match === null || match === undefined) return null;
  const m = match as PriorEvidence;
  if (typeof m.id !== "string" || typeof m.score !== "number") {
    throw new Error(`recall evidence: malformed match: ${res.stdout.trim()}`);
  }
  return m;
}
