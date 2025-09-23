import { releaseVersion, releaseChangelog, releasePublish } from 'nx/release';
import { execSync } from 'child_process';
(async () => {
  const { workspaceVersion, projectsVersionData } = await releaseVersion({
    verbose: true,
    gitCommit: false,
    stageChanges: false,
    specifier: 'prerelease',
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
