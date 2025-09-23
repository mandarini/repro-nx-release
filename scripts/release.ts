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

  const result = await releaseChangelog({
    versionData: projectsVersionData,
    version: workspaceVersion,
    verbose: true,
    gitCommit: false,
    stageChanges: false,
  });

  execSync('git add CHANGELOG.md');
  execSync('git add packages/**/CHANGELOG.md');
  console.log('💾 Committing changelog updates...');
  const version =
    result.workspaceChangelog?.releaseVersion.rawVersion || workspaceVersion;
  execSync(`git commit -m "chore(release): publish version ${version}"`);
  execSync('git push');
  console.log('✅ Changelog updates pushed to remote');

  const publishResult = await releasePublish({
    // registry: 'https://registry.npmjs.org/',
    registry: 'http://localhost:4873',
    access: 'public',
    tag: 'canary',
    verbose: true,
  });

  execSync('git stash');
  console.log('✅ Package.json changes stashed');

  process.exit(
    Object.values(publishResult).every((result) => result.code === 0) ? 0 : 1
  );
})();
