import { releaseVersion, releaseChangelog, releasePublish } from 'nx/release';
import * as fs from 'fs-extra';
import * as path from 'path';
import { exec, execSync } from 'child_process';

(async () => {
  const { workspaceVersion, projectsVersionData } = await releaseVersion({
    verbose: true,
    gitCommit: false,
    stageChanges: false,
    specifier: 'prerelease',
    preid: 'canary',
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
  console.log(
    'versions',
    result.workspaceChangelog?.releaseVersion.rawVersion,
    result.workspaceChangelog?.releaseVersion.gitTag
  );

  console.log(
    'versions proj',
    result.projectChangelogs?.['lib1']?.releaseVersion
  );

  // execute git add for files that are in the pattern of CHANGELOG.md in root and in subfolders
  console.log('🔄 Starting git operations...');

  console.log('📝 Adding root CHANGELOG.md to git...');
  execSync('git add CHANGELOG.md');
  console.log('✅ Root CHANGELOG.md added');

  console.log('📝 Adding package CHANGELOG.md files to git...');
  execSync('git add packages/**/CHANGELOG.md');
  console.log('✅ Package CHANGELOG.md files added');

  console.log('💾 Committing changelog updates...');
  const version =
    result.workspaceChangelog?.releaseVersion.rawVersion || workspaceVersion;
  execSync(`git commit -m "chore(release): publish version ${version}"`);
  console.log('✅ Changelog updates committed');

  console.log('🚀 Pushing changes to remote...');
  execSync('git push');
  console.log('✅ Changes pushed to remote');

  // console.log('📦 Skipping publish step (mocked)...');
  // Mock the publish result to simulate successful publishing
  // const publishResult = {
  //   lib1: { code: 0 },
  //   lib2: { code: 0 },
  //   lib3: { code: 0 },
  //   lib4: { code: 0 },
  //   lib5: { code: 0 },
  //   main: { code: 0 },
  // };
  // console.log('✅ Publish step mocked successfully');

  // Uncomment below to actually run the publish step
  const publishResult = await releasePublish({
    // registry: 'https://registry.npmjs.org/',
    registry: 'http://localhost:4873',
    access: 'public',
    tag: 'canary',
    verbose: true,
  });

  console.log('🔄 Stashing changes...');
  execSync('git stash');
  console.log('✅ Changes stashed');

  process.exit(
    Object.values(publishResult).every((result) => result.code === 0) ? 0 : 1
  );
})();
