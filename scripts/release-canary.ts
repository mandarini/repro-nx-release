import { releaseVersion, releaseChangelog, releasePublish } from 'nx/release';
import { execSync } from 'child_process';
import { getLastStableTag } from './utils';
(async () => {
  const { workspaceVersion: canaryCheckWorkspaceVersion } = await releaseVersion({
    verbose: true,
    gitCommit: false,
    stageChanges: false,
    dryRun: true, // Just to check if there are any conventional commits that warrant a release
  });

  // If no version bump detected, exit early
  if (!canaryCheckWorkspaceVersion || canaryCheckWorkspaceVersion === '0.0.0') {
    console.log(
      'ℹ️  No conventional commits found that warrant a release. Skipping canary release.'
    );
    process.exit(0);
  }

  // Determine the canary version by looking at ALL commits since the last stable tag.
  // The base version (major.minor.patch) reflects what the next stable will be;
  // the canary number (canary.x) simply increments for each canary on that base.
  const lastStableTag = getLastStableTag(); // e.g. 'v1.1.0'
  const stableBase = lastStableTag.replace(/^v/, ''); // '1.1.0'
  const [maj, min, pat] = stableBase.split('.').map(Number);

  // Parse all commits since last stable to determine the correct bump type
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

  const targetBase =
    bumpType === 'major'
      ? `${maj + 1}.0.0`
      : bumpType === 'minor'
        ? `${maj}.${min + 1}.0`
        : `${maj}.${min}.${pat + 1}`;

  // Find the next canary number for this base
  const existingCanaries = execSync(
    `git tag --list 'v${targetBase}-canary.*' --sort=-version:refname`
  )
    .toString()
    .trim()
    .split('\n')
    .filter(Boolean);
  const highestN =
    existingCanaries.length > 0
      ? parseInt(existingCanaries[0].match(/-canary\.(\d+)$/)?.[1] ?? '-1', 10)
      : -1;
  const canaryVersion = `${targetBase}-canary.${highestN + 1}`;

  const { workspaceVersion, projectsVersionData } = await releaseVersion({
    verbose: true,
    gitCommit: false,
    stageChanges: false,
    specifier: canaryVersion,
    preid: 'canary',
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
    tag: 'canary',
    verbose: true,
  });

  execSync('git stash');
  console.log('✅ All changes stashed.');

  process.exit(
    Object.values(publishResult).every((result) => result.code === 0) ? 0 : 1
  );
})();
