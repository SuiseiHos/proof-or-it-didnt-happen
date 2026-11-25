export interface Claim {
  id: string;
  negative: string;
  positive: string;
}

/**
 * Parse a CLAIMS.md file. Each claim is a `## <id>` section with exactly
 * one `negative: <command>` line (broken input, must fail) and one
 * `positive: <command>` line (fixed input, must pass). Anything else is
 * rejected so a typo can never silently drop a command.
 */
export function parseClaims(text: string): Claim[] {
  const claims: Claim[] = [];
  const seen = new Set<string>();
  let current: { id: string; negative?: string; positive?: string } | null =
    null;

  const flush = () => {
    if (current === null) return;
    if (current.negative === undefined) {
      throw new Error(`claim ${current.id} is missing its negative command`);
    }
    if (current.positive === undefined) {
      throw new Error(`claim ${current.id} is missing its positive command`);
    }
    claims.push({
      id: current.id,
      negative: current.negative,
      positive: current.positive,
    });
  };

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (line === "") continue;
    if (line.startsWith("#") && !line.startsWith("##")) continue;
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      flush();
      const id = heading[1].trim();
      if (seen.has(id)) throw new Error(`duplicate claim id: ${id}`);
      seen.add(id);
      current = { id };
      continue;
    }
    if (current === null) {
      throw new Error(`line outside any claim section: ${line}`);
    }
    const field = line.match(/^(negative|positive):\s*(.+)$/);
    if (field) {
      current[field[1] as "negative" | "positive"] = field[2].trim();
      continue;
    }
    throw new Error(`unknown line in claim ${current.id}: ${line}`);
  }
  flush();
  return claims;
}
