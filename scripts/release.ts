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

  await releaseChangelog({
    versionData: projectsVersionData,
    version: workspaceVersion,
    verbose: true,
  });

  const publishResult = await releasePublish({
    // registry: 'https://registry.npmjs.org/',
    registry: 'http://localhost:4873',
    access: 'public',
    tag: 'canary',
    verbose: true,
  });
  process.exit(
    Object.values(publishResult).every((result) => result.code === 0) ? 0 : 1
  );
})();
