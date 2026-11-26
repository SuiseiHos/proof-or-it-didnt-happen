import type { Claim } from "./claims";
import type { ClaimResult, ExecFn, ExecResult, Verdict } from "./runner";

export interface PriorEvidence {
  id: string;
  result: Verdict;
  score: number;
  text: string;
}

export const DEFAULT_CONNECTION_ID = "-DUWCdlfSnCjOKiXO8xJrQ";

/**
 * The command that runs the Sprite-side Pinecone helper. The gateway
 * connection ID can be overridden with PINECONE_GATEWAY_CONNECTION_ID so
 * anyone can point the tool at their own connector; an unsafe value is
 * ignored (the helper's own default applies).
 */
export function helperCommand(): string {
  const id = process.env.PINECONE_GATEWAY_CONNECTION_ID;
  if (id && /^[A-Za-z0-9_-]+$/.test(id)) {
    return `PINECONE_GATEWAY_CONNECTION_ID=${id} python3 /home/sprite/pinecone.py`;
  }
  return "python3 /home/sprite/pinecone.py";
}

/**
 * When a claim was proven before and is owed now, memory has caught a
 * regression: the world changed under an unchanged claim. Returns the
 * line to print, or null when there is nothing to flag.
 */
export function regressionNote(
  prior: PriorEvidence | null,
  result: ClaimResult,
): string | null {
  if (prior && prior.result === "proven" && result.verdict === "owed") {
    return `${result.id} REGRESSION: was proven before, now owed`;
  }
  return null;
}

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
  // An empty snippet base64-encodes to nothing, which would leave
  // --snippet-b64 with no value and make argparse exit 2. Store a
  // placeholder instead, and quote every base64 argument so the shell
  // can never drop one.
  const safeSnippet = snippet === "" ? "(no output)" : snippet;
  const res = await exec(
    `${helperCommand()} store --id ${claimId} --text-b64 "${b64(text)}" --result ${result} --snippet-b64 "${b64(safeSnippet)}"`,
  );
  requireOk(res, `store evidence for ${claimId}`);
}

/** Recall the previously stored verdict for a claim, or null when none exists. */
export async function recallEvidence(exec: ExecFn, text: string): Promise<PriorEvidence | null> {
  const res = await exec(`${helperCommand()} recall --text-b64 "${b64(text)}"`);
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
