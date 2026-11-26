#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";
import { parseClaims } from "./claims";
import { claimText, recallEvidence, regressionNote, storeEvidence, type PriorEvidence } from "./pinecone";
import { checkClaim, type ClaimResult } from "./runner";
import { spriteExec, uploadDir, uploadFixtures } from "./sprite";

function printTable(results: ClaimResult[]): void {
  const width = Math.max(...results.map((r) => r.id.length), "claim".length);
  const pad = (s: string, n: number) => s.padEnd(n, " ");
  console.log(`${pad("claim", width)}  verdict  neg  pos  evidence`);
  for (const r of results) {
    console.log(
      `${pad(r.id, width)}  ${pad(r.verdict.toUpperCase(), 7)}  ${String(r.negativeExit).padStart(3)}  ${String(r.positiveExit).padStart(3)}  ${r.snippet}`,
    );
  }
}

async function main(argv: string[]): Promise<number> {
  const [command, claimsPath] = argv;
  if (command !== "check" || !claimsPath) {
    console.error("usage: proof check <CLAIMS.md>");
    return 2;
  }
  let text: string;
  try {
    text = fs.readFileSync(claimsPath, "utf8");
  } catch {
    console.error(`cannot read ${claimsPath}`);
    return 2;
  }
  let claims;
  try {
    claims = parseClaims(text);
  } catch (err) {
    console.error(`invalid CLAIMS.md: ${(err as Error).message}`);
    return 2;
  }
  if (claims.length === 0) {
    console.error("no claims found");
    return 2;
  }
  const fixturesDir = path.join(__dirname, "..", "..", "fixtures");
  if (fs.existsSync(fixturesDir)) uploadFixtures(fixturesDir);
  const spriteDir = path.join(__dirname, "..", "..", "sprite");
  if (fs.existsSync(spriteDir)) uploadDir(spriteDir, "/home/sprite");
  const results: ClaimResult[] = [];
  const priors: (PriorEvidence | null)[] = [];
  const storeErrors: string[] = [];
  for (const claim of claims) {
    let prior: PriorEvidence | null = null;
    try {
      prior = await recallEvidence(spriteExec, claimText(claim));
    } catch (err) {
      console.error(
        `warning: recall failed for ${claim.id}: ${(err as Error).message} — continuing without prior evidence`,
      );
    }
    priors.push(prior);
    const result = await checkClaim(claim, spriteExec);
    results.push(result);
    try {
      await storeEvidence(spriteExec, claim.id, claimText(claim), result.verdict, result.snippet);
    } catch (err) {
      // A store failure must not hide the verdicts: record it, keep
      // going, and fail the run after the table is printed.
      const msg = `error: could not store evidence for ${claim.id}: ${(err as Error).message}`;
      console.error(msg);
      storeErrors.push(msg);
    }
  }
  printTable(results);
  for (let i = 0; i < results.length; i++) {
    const prior = priors[i];
    if (prior) {
      console.log(`${results[i].id} seen before: ${prior.result} (score ${prior.score.toFixed(2)})`);
    }
  }
  for (let i = 0; i < results.length; i++) {
    const note = regressionNote(priors[i], results[i]);
    if (note) console.log(note);
  }
  const proven = results.filter((r) => r.verdict === "proven").length;
  const owed = results.length - proven;
  console.log(`${proven} proven, ${owed} owed.`);
  if (storeErrors.length > 0) {
    for (const e of storeErrors) console.error(e);
    return 1;
  }
  return owed === 0 ? 0 : 1;
}

main(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  });
