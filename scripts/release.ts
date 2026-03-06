#!/usr/bin/env bun

const BUMP_TYPES = ["patch", "minor", "major"] as const;
type BumpType = (typeof BUMP_TYPES)[number];

function bumpVersion(current: string, type: BumpType): string {
  const [major, minor, patch] = current.split(".").map(Number);
  switch (type) {
    case "major": return `${major + 1}.0.0`;
    case "minor": return `${major}.${minor + 1}.0`;
    case "patch": return `${major}.${minor}.${patch + 1}`;
  }
}

async function run(cmd: string[], { dry = false } = {}): Promise<string> {
  console.log(`  $ ${cmd.join(" ")}`);
  if (dry) return "";
  const result = await Bun.spawn(cmd, {
    stdout: "pipe",
    stderr: "inherit",
  });
  const output = await new Response(result.stdout).text();
  const code = await result.exited;
  if (code !== 0) {
    throw new Error(`Command failed with exit code ${code}: ${cmd.join(" ")}`);
  }
  return output.trim();
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const bumpType = args.find((a) => BUMP_TYPES.includes(a as BumpType)) as BumpType | undefined;

  if (!bumpType) {
    console.error(`Usage: bun scripts/release.ts <patch|minor|major> [--dry-run]`);
    process.exit(1);
  }

  if (dryRun) console.log("[dry-run mode]\n");

  // 1. Preflight
  console.log("Preflight checks...");
  if (!dryRun) {
    const status = await run(["git", "status", "--porcelain"]);
    if (status) {
      console.error("Working tree is not clean. Commit or stash changes first.");
      process.exit(1);
    }
    const branch = await run(["git", "rev-parse", "--abbrev-ref", "HEAD"]);
    if (branch !== "master") {
      console.error(`Must be on master branch (currently on ${branch}).`);
      process.exit(1);
    }
  } else {
    console.log("  (skipped in dry-run)");
  }

  // 2. Bump version
  const pkgPath = new URL("../package.json", import.meta.url).pathname;
  const pkg = await Bun.file(pkgPath).json();
  const oldVersion = pkg.version;
  const newVersion = bumpVersion(oldVersion, bumpType);
  console.log(`\nBump ${oldVersion} → ${newVersion}`);

  if (!dryRun) {
    pkg.version = newVersion;
    await Bun.write(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  }

  // 3. Build
  console.log("\nBuild...");
  await run(["bun", "run", "build"], { dry: dryRun });

  // 4. Test
  console.log("\nTest...");
  await run(["bun", "test"], { dry: dryRun });

  // 5. Git commit
  console.log("\nGit commit...");
  await run(["git", "add", "package.json"], { dry: dryRun });
  await run(["git", "commit", "-m", `release: v${newVersion}`], { dry: dryRun });

  // 6. Git tag
  console.log("\nGit tag...");
  await run(["git", "tag", `v${newVersion}`], { dry: dryRun });

  // 7. Publish
  console.log("\nPublish...");
  await run(["npm", "publish"], { dry: dryRun });

  // 8. Push
  console.log("\nGit push...");
  await run(["git", "push"], { dry: dryRun });
  await run(["git", "push", "--tags"], { dry: dryRun });

  // 9. GitHub Release
  console.log("\nGitHub Release...");
  await run(["gh", "release", "create", `v${newVersion}`, "--generate-notes"], { dry: dryRun });

  console.log(`\nDone! Released v${newVersion}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
