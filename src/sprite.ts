import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { ExecResult } from "./runner";

export const DEFAULT_SPRITE_ORG = "aldantus23-gmail-com";
export const DEFAULT_SPRITE_NAME = "proof-or-it-didnt-happen";

/**
 * The Sprite this CLI talks to. Override with SPRITE_ORG / SPRITE_NAME so
 * anyone can point the tool at their own Sprite without editing source.
 */
export function spriteConfig(): { org: string; name: string } {
  return {
    org: process.env.SPRITE_ORG ?? DEFAULT_SPRITE_ORG,
    name: process.env.SPRITE_NAME ?? DEFAULT_SPRITE_NAME,
  };
}

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
  const { org, name } = spriteConfig();
  const run = runSprite([
    "exec",
    "-o",
    org,
    "-s",
    name,
    "--no-stdin",
    "--",
    "sh",
    "-c",
    cmd,
  ]);
  return Promise.resolve({ exit: run.status, stdout: run.stdout, stderr: run.stderr });
}

/**
 * Upload every file in a local directory to a destination directory inside
 * the project Sprite. Evidence must live under $HOME, never /tmp: /tmp does
 * not survive a checkpoint restore.
 */
export function uploadDir(dir: string, destDir: string): void {
  const { org, name } = spriteConfig();
  for (const file of fs.readdirSync(dir).sort()) {
    const local = path.join(dir, file);
    if (!fs.statSync(local).isFile()) continue;
    const dest = `${destDir}/${file}`;
    const run = runSprite([
      "exec",
      "-o",
      org,
      "-s",
      name,
      "--no-stdin",
      "--file",
      `${local}:${dest}`,
      "--",
      "true",
    ]);
    if (run.status !== 0) {
      throw new Error(`upload failed for ${file}: ${run.stderr}`);
    }
  }
}

/** Upload the demo fixtures to /home/sprite/fixtures/ inside the Sprite. */
export function uploadFixtures(dir: string): void {
  uploadDir(dir, "/home/sprite/fixtures");
}
