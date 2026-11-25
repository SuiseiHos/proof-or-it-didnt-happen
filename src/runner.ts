import type { Claim } from "./claims";

export interface ExecResult {
  exit: number;
  stdout: string;
  stderr: string;
}

export type ExecFn = (cmd: string) => Promise<ExecResult>;

export type Verdict = "proven" | "owed";

export interface ClaimResult {
  id: string;
  verdict: Verdict;
  reason: string;
  negativeExit: number;
  positiveExit: number;
  snippet: string;
}

/**
 * A claim is proven only when its negative test fails (broken input must
 * fail), its positive test passes, and the positive test prints something.
 * Anything else is owed, with the reason naming the failed condition.
 */
export async function checkClaim(
  claim: Claim,
  exec: ExecFn,
): Promise<ClaimResult> {
  const neg = await exec(claim.negative);
  const pos = await exec(claim.positive);
  const snippet = (pos.stdout || pos.stderr).trim().split("\n")[0] ?? "";

  if (neg.exit === 0) {
    return owed(claim, neg, pos, "negative test passed but must fail", snippet);
  }
  if (pos.exit !== 0) {
    return owed(claim, neg, pos, `positive test failed with exit ${pos.exit}`, snippet);
  }
  if (pos.stdout.trim() === "") {
    return owed(claim, neg, pos, "positive test passed but printed nothing (empty output)", snippet);
  }
  return {
    id: claim.id,
    verdict: "proven",
    reason: `negative failed (exit ${neg.exit}), positive passed with output`,
    negativeExit: neg.exit,
    positiveExit: pos.exit,
    snippet,
  };
}

function owed(
  claim: Claim,
  neg: ExecResult,
  pos: ExecResult,
  reason: string,
  snippet: string,
): ClaimResult {
  return {
    id: claim.id,
    verdict: "owed",
    reason,
    negativeExit: neg.exit,
    positiveExit: pos.exit,
    snippet,
  };
}
