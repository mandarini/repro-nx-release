import { releaseVersion, releaseChangelog, releasePublish } from 'nx/release';
import { execSync } from 'child_process';
import { getLastStableTag, getArg } from './utils';

const version = getArg('version');

if (!version) {
  console.error(
    `Usage: npm run release-beta -- --version <prerelease-version>\n` +
      `Examples:\n` +
      `  --version 2.101.0-beta.0\n` +
      `  --version 2.101.0-beta.1\n`
  );
  process.exit(1);
}

// Must be a valid prerelease semver (e.g. 2.101.0-beta.0)
const isValidPrerelease = /^\d+\.\d+\.\d+-[a-zA-Z0-9.-]+$/.test(version);
if (!isValidPrerelease) {
  console.error(
    `❌ Invalid version: "${version}". Must be a prerelease semver, e.g. 2.101.0-beta.0`
  );
  process.exit(1);
}

// Extract the preid (e.g. 'beta' from '2.101.0-beta.0')
const preid = version.split('-')[1].split('.')[0];

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
    specifier: version,
    preid,
  });

  // Generate changelog anchored to last stable tag so beta tags never pollute
  // the commit range used by future stable releases
  await releaseChangelog({
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
    tag: 'beta',
    verbose: true,
  });

  execSync('git stash');
  console.log('✅ Stashed package.json changes');

  process.exit(Object.values(publishResult).every((r) => r.code === 0) ? 0 : 1);
})();
