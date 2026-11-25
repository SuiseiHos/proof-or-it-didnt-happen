#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";
import { parseClaims } from "./claims";
import { checkClaim, type ClaimResult } from "./runner";
import { spriteExec, uploadFixtures } from "./sprite";

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
  const results: ClaimResult[] = [];
  for (const claim of claims) {
    results.push(await checkClaim(claim, spriteExec));
  }
  printTable(results);
  const proven = results.filter((r) => r.verdict === "proven").length;
  const owed = results.length - proven;
  console.log(`${proven} proven, ${owed} owed.`);
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
