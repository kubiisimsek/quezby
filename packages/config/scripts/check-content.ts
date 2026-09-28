/**
 * Checks files of posts against the catalog's rules while they are being
 * written — the same rules the tests hold every post to:
 *
 *   pnpm --filter @quezby/config exec tsx scripts/check-content.ts src/content/posts/skip-chat.ts
 *   pnpm --filter @quezby/config exec tsx scripts/check-content.ts --pools
 *
 * A post's kind is the start of its file's name (`skip-chat.ts` → skip) or,
 * in a theme file, the end of its list's name (`HOME_SKIP` → skip). Prints
 * each problem with the post's place and exits non-zero when there is one.
 */
import { basename, resolve } from 'node:path';

import type { ContentKind, Draft } from '../src/content/types';
import { draftProblems, poolProblems } from './content-rules';

const KINDS: readonly ContentKind[] = ['skip', 'like', 'hold', 'freeze'];

async function main(): Promise<number> {
  let failures = 0;
  const report = (where: string, problems: string[]) => {
    for (const problem of problems) console.log(`✗ ${where} ${problem}`);
    failures += problems.length;
  };

  for (const arg of process.argv.slice(2)) {
    if (arg === '--pools') {
      report('pools', poolProblems());
      continue;
    }
    const byFile = basename(arg).split('-')[0] as ContentKind;
    const module = (await import(resolve(arg))) as Record<string, readonly Draft[]>;
    let posts = 0;
    for (const [name, drafts] of Object.entries(module)) {
      const bySuffix = /_(SKIP|LIKE|HOLD|FREEZE)$/.exec(name)?.[1]?.toLowerCase() as ContentKind | undefined;
      const kind = KINDS.includes(byFile) ? byFile : bySuffix;
      if (!kind) {
        console.log(`✗ ${arg} ${name}: name the file skip-…, like-…, hold-… or freeze-…, or the list …_SKIP, …_LIKE, …_HOLD or …_FREEZE`);
        failures += 1;
        continue;
      }
      drafts.forEach((draft, i) => {
        posts += 1;
        report(`${name}[${i}] (${draft.caption.tr})`, draftProblems(kind, draft));
      });
    }
    console.log(`${basename(arg)}: ${posts} posts checked`);
  }

  console.log(failures === 0 ? '✓ no problems' : `${failures} problem(s)`);
  return failures === 0 ? 0 : 1;
}

void main().then((code) => {
  process.exitCode = code;
});
