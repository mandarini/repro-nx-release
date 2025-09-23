import { releaseVersion, releaseChangelog, releasePublish } from 'nx/release';
import * as fs from 'fs-extra';
import * as path from 'path';
import { exec } from 'child_process';

(async () => {
  const { workspaceVersion, projectsVersionData } = await releaseVersion({
    verbose: true,
    gitCommit: false,
    stageChanges: false,
  });

  console.log('workspaceVersion', workspaceVersion);
  console.log('projectsVersionData', projectsVersionData);

  const result = await releaseChangelog({
    versionData: projectsVersionData,
    version: workspaceVersion,
    verbose: true,
    gitCommit: false,
    stageChanges: false,
  });

  console.log('result', result);

  // execute git add for files that are in the pattern of CHANGELOG.md in root and in subfolders
  exec('git add CHANGELOG.md');
  exec('git add packages/**/CHANGELOG.md');
  exec('git commit -m "chore: update changelog"');
  exec('git push');

  const publishResult = await releasePublish({
    // registry: 'https://registry.npmjs.org/',
    registry: 'http://localhost:4873',
    access: 'public',
    tag: 'canary',
    verbose: true,
  });

  exec('git stash');

  process.exit(
    Object.values(publishResult).every((result) => result.code === 0) ? 0 : 1
  );
})();
