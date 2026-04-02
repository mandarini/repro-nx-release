import { releaseVersion, releaseChangelog, releasePublish } from 'nx/release';
import { execSync } from 'child_process';
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

  // Derive the correct pre* specifier from conventional commits rather than
  // always using 'prerelease' (which always bumps patch regardless of commit type).
  // Use the last tag (canary OR stable) as the baseline so that a minor bump already
  // captured in a previous canary isn't counted again on subsequent fix-only commits.
  const lastTag = execSync(
    `git tag --list --sort=-version:refname | grep -E '^v?[0-9]+\\.[0-9]+\\.[0-9]+' | head -n1`
  )
    .toString()
    .trim();
  const lastBase = lastTag.replace(/^v/, '').replace(/-.*$/, ''); // e.g. "2.102.0" from "2.102.0-canary.0"
  const [curMajor, curMinor] = lastBase.split('.').map(Number);
  const dryBase = canaryCheckWorkspaceVersion.replace(/^v/, '').replace(/-.*$/, '');
  const [newMajor, newMinor] = dryBase.split('.').map(Number);

  let specifier: 'prepatch' | 'preminor' | 'premajor';
  if (newMajor > curMajor) specifier = 'premajor';
  else if (newMinor > curMinor) specifier = 'preminor';
  else specifier = 'prepatch';

  const { workspaceVersion, projectsVersionData } = await releaseVersion({
    verbose: true,
    gitCommit: false,
    stageChanges: false,
    specifier,
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
