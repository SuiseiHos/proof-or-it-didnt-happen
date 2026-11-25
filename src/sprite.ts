import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { ExecResult } from "./runner";

export const SPRITE_ORG = "aldantus23-gmail-com";
export const SPRITE_NAME = "proof-or-it-didnt-happen";

/** The sprite CLI ships on PATH after install; this VM keeps it under ~/.local/bin. */
function spriteBin(): string {
  if (process.env.SPRITE_BIN) return process.env.SPRITE_BIN;
  const local = path.join(os.homedir(), ".local", "bin", "sprite");
  if (fs.existsSync(local)) return local;
  return "sprite";
}

function runSprite(args: string[]): { status: number; stdout: string; stderr: string } {
  const run = spawnSync(spriteBin(), args, { encoding: "utf8", timeout: 120_000 });
  if (run.error) throw run.error;
  return {
    status: run.status ?? 99,
    stdout: run.stdout ?? "",
    stderr: run.stderr ?? "",
  };
}

/** Run one shell command inside the project Sprite. Exit codes propagate. */
export function spriteExec(cmd: string): Promise<ExecResult> {
  const run = runSprite([
    "exec",
    "-o",
    SPRITE_ORG,
    "-s",
    SPRITE_NAME,
    "--no-stdin",
    "--",
    "sh",
    "-c",
    cmd,
  ]);
  return Promise.resolve({ exit: run.status, stdout: run.stdout, stderr: run.stderr });
}

/**
 * Upload every file in a local directory to /home/sprite/fixtures/ inside
 * the project Sprite. Evidence must live under $HOME, never /tmp: /tmp does
 * not survive a checkpoint restore.
 */
export function uploadFixtures(dir: string): void {
  for (const file of fs.readdirSync(dir).sort()) {
    const local = path.join(dir, file);
    if (!fs.statSync(local).isFile()) continue;
    const dest = `/home/sprite/fixtures/${file}`;
    const run = runSprite([
      "exec",
      "-o",
      SPRITE_ORG,
      "-s",
      SPRITE_NAME,
      "--no-stdin",
      "--file",
      `${local}:${dest}`,
      "--",
      "true",
    ]);
    if (run.status !== 0) {
      throw new Error(`fixture upload failed for ${file}: ${run.stderr}`);
    }
  }
}
