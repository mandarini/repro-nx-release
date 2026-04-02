import { releaseVersion, releaseChangelog, releasePublish } from 'nx/release';
import { execSync } from 'child_process';
import { writeFile } from 'fs/promises';
import { getLastStableTag, getArg } from './utils';

const versionSpecifier = getArg('versionSpecifier') ?? process.argv[2]; // optional positional fallback

if (!versionSpecifier) {
  console.error(
    `Usage: npm run release-stable -- --versionSpecifier <specifier>\n` +
      `Examples:\n` +
      `  --versionSpecifier patch | minor | major | prepatch | preminor | premajor | prerelease\n` +
      `  --versionSpecifier v2.3.4 (explicit version)\n`
  );
  process.exit(1);
}

// Validate versionSpecifier to prevent command injection
const validSpecifiers = [
  'patch',
  'minor',
  'major',
  'prepatch',
  'preminor',
  'premajor',
  'prerelease',
];
const isValidVersion = /^v?\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/.test(versionSpecifier);
if (!validSpecifiers.includes(versionSpecifier) && !isValidVersion) {
  console.error(`❌ Invalid version specifier: ${versionSpecifier}`);
  console.error(`Must be one of: ${validSpecifiers.join(', ')} or a valid semver version`);
  process.exit(1);
}

function safeExec(cmd: string, opts = {}) {
  try {
    return execSync(cmd, { stdio: 'inherit', ...opts });
  } catch (err) {
    console.error(`❌ Command failed: ${cmd}`);
    throw err;
  }
}

(async () => {
  const { workspaceVersion, projectsVersionData } = await releaseVersion({
    verbose: true,
    gitCommit: false,
    stageChanges: false,
    specifier: versionSpecifier,
  });

  const result = await releaseChangelog({
    versionData: projectsVersionData,
    version: workspaceVersion,
    verbose: true,
    gitCommit: false,
    stageChanges: false,
    from: getLastStableTag(),
  });

  const publishResult = await releasePublish({
    registry: 'http://localhost:4873',
    access: 'public',
    tag: 'latest',
    verbose: true,
  });

  const version = result.workspaceChangelog?.releaseVersion.rawVersion || workspaceVersion;

  // Write version to file for CI to read
  try {
    await writeFile('.release-version', version ?? '', 'utf-8');
  } catch (error) {
    console.error('❌ Failed to write release version to file', error);
  }

  // Validate version to prevent command injection
  if (
    !version ||
    !/^(v?\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?|patch|minor|major|prepatch|preminor|premajor|prerelease)$/.test(
      version
    )
  ) {
    console.error(`❌ Invalid version format: ${version}`);
    process.exit(1);
  }

  const branchName = `release-${version}`;

  try {
    safeExec(`git checkout -b ${branchName}`);
    safeExec('git add CHANGELOG.md || true');
    safeExec('git add packages/**/CHANGELOG.md || true');

    // Commit changes if any
    try {
      safeExec(`git commit -m "chore(release): version ${version} changelogs"`);
    } catch {
      console.log('No changes to commit');
    }

    safeExec(`git push origin ${branchName}`);

    // Open PR using GitHub CLI
    safeExec(
      `gh pr create --base main --head ${branchName} --title "chore(release): version ${version} changelogs" --body "Automated PR to update changelogs for version ${version}."`
    );

    // Enable auto-merge
    safeExec(`gh pr merge --auto --squash`);

    safeExec('git stash');
    console.log('✅ Stashed package.json changes');
  } catch (err) {
    console.error('❌ Failed to push release branch or open PR', err);
  }

  process.exit(Object.values(publishResult).every((r) => r.code === 0) ? 0 : 1);
})();
