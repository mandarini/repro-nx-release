import { releaseVersion, releaseChangelog, releasePublish } from 'nx/release';
import { execSync } from 'child_process';

function getArg(name: string): string | undefined {
  // supports --name=value and --name value
  const idx = process.argv.findIndex(
    (a) => a === `--${name}` || a.startsWith(`--${name}=`)
  );
  if (idx === -1) return undefined;
  const token = process.argv[idx];
  if (token.includes('=')) return token.split('=')[1];
  return process.argv[idx + 1]; // next token
}

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
  });

  const publishResult = await releasePublish({
    registry: 'http://localhost:4873',
    access: 'public',
    tag: 'latest',
    verbose: true,
  });

  // ---- New: create release branch + PR ----
  const version =
    result.workspaceChangelog?.releaseVersion.rawVersion || workspaceVersion;
  const branchName = `release-${version}`;

  try {
    execSync(`git checkout -b ${branchName}`);
    execSync('git add CHANGELOG.md || true');
    execSync('git add packages/**/CHANGELOG.md || true');

    // Commit changes if any
    try {
      execSync(`git commit -m "chore(release): publish version ${version}"`);
    } catch {
      console.log('No changes to commit');
    }

    execSync(`git push origin ${branchName}`);

    // Open PR using GitHub CLI
    execSync(
      `gh pr create --base main --head ${branchName} --title "chore(release): ${version}" --body "Automated release PR for ${version}"`,
      { stdio: 'inherit' }
    );

    // Enable auto-merge
    execSync(`gh pr merge --auto --squash`, { stdio: 'inherit' });

    execSync('git stash');
    console.log('✅ Stashed package.json changes');
  } catch (err) {
    console.error('❌ Failed to push release branch or open PR', err);
  }

  process.exit(Object.values(publishResult).every((r) => r.code === 0) ? 0 : 1);
})();
