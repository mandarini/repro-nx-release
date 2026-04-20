import { releaseVersion, releaseChangelog, releasePublish } from 'nx/release';
import { execSync } from 'child_process';
import { getLastStableTag, getArg } from './utils';

// Optional CLI flags for overriding default behavior (used by develop branch for next prereleases):
//   --base-version <version>  Skip bump detection, use this as the base (e.g. 2.0.0)
//   --preid <id>              Prerelease identifier (default: canary)
//   --tag <tag>               npm dist-tag (default: canary)
const baseVersionArg = getArg('base-version');
const preidArg = getArg('preid') ?? 'canary';
const tagArg = getArg('tag') ?? 'canary';

(async () => {
  let targetBase: string;

  if (baseVersionArg) {
    // Explicit base version provided (e.g. from develop branch for next prereleases).
    // Skip dry-run check and commit parsing — always publish.
    targetBase = baseVersionArg;
  } else {
    // Auto-detect version from conventional commits (default behavior for main/canary)
    const { workspaceVersion: canaryCheckWorkspaceVersion } = await releaseVersion({
      verbose: true,
      gitCommit: false,
      stageChanges: false,
      dryRun: true,
    });

    if (!canaryCheckWorkspaceVersion || canaryCheckWorkspaceVersion === '0.0.0') {
      console.log(
        'ℹ️  No conventional commits found that warrant a release. Skipping canary release.'
      );
      process.exit(0);
    }

    const lastStableTag = getLastStableTag();
    const stableBase = lastStableTag.replace(/^v/, '');
    const [maj, min, pat] = stableBase.split('.').map(Number);

    const commitMessages = execSync(`git log ${lastStableTag}..HEAD --format=%s`)
      .toString()
      .trim()
      .split('\n')
      .filter(Boolean);

    let bumpType: 'major' | 'minor' | 'patch' = 'patch';
    for (const msg of commitMessages) {
      if (/^[a-z]+(\([^)]+\))?!:/.test(msg) || msg.includes('BREAKING CHANGE')) {
        bumpType = 'major';
        break;
      }
      if (/^feat(\([^)]+\))?:/.test(msg) && bumpType !== 'major') {
        bumpType = 'minor';
      }
    }

    targetBase =
      bumpType === 'major'
        ? `${maj + 1}.0.0`
        : bumpType === 'minor'
          ? `${maj}.${min + 1}.0`
          : `${maj}.${min}.${pat + 1}`;
  }

  execSync('git fetch --tags', { stdio: 'inherit' });

  const existingPrereleases = execSync(
    `git tag --list 'v${targetBase}-${preidArg}.*' --sort=-version:refname`
  )
    .toString()
    .trim()
    .split('\n')
    .filter(Boolean);
  const preidPattern = new RegExp(`-${preidArg}\\.(\\d+)$`);
  const highestN =
    existingPrereleases.length > 0
      ? parseInt(existingPrereleases[0].match(preidPattern)?.[1] ?? '-1', 10)
      : -1;
  const prereleaseVersion = `${targetBase}-${preidArg}.${highestN + 1}`;

  const { workspaceVersion, projectsVersionData } = await releaseVersion({
    verbose: true,
    gitCommit: false,
    stageChanges: false,
    specifier: prereleaseVersion,
    preid: preidArg,
  });

  await releaseChangelog({
    versionData: projectsVersionData,
    version: workspaceVersion,
    verbose: true,
    gitCommit: false,
    stageChanges: false,
  });

  const publishResult = await releasePublish({
    registry: 'http://localhost:4873',
    access: 'public',
    tag: tagArg,
    verbose: true,
  });

  execSync('git stash');
  console.log('✅ All changes stashed.');

  process.exit(
    Object.values(publishResult).every((result) => result.code === 0) ? 0 : 1
  );
})();
