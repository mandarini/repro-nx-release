import { releaseVersion, releaseChangelog, releasePublish } from 'nx/release';
import * as fs from 'fs-extra';
import * as path from 'path';

async function copyPackagesToBuild() {
  const buildDir = path.join(process.cwd(), 'build');
  const packagesDir = path.join(process.cwd(), 'packages', 'core');

  // Remove build directory if it exists and create it fresh
  await fs.remove(buildDir);
  await fs.ensureDir(buildDir);
  await fs.ensureDir(path.join(buildDir, 'packages', 'core'));

  // Get all package directories
  const packageDirs = await fs.readdir(packagesDir);

  // Copy each package directory
  for (const pkg of packageDirs) {
    const srcDir = path.join(packagesDir, pkg);
    const destDir = path.join(buildDir, 'packages', 'core', pkg);

    // Only copy if it's a directory
    const stats = await fs.stat(srcDir);
    if (!stats.isDirectory()) continue;

    await fs.copy(srcDir, destDir, {
      filter: (src) => {
        // Skip node_modules, test files
        return (
          !src.includes('node_modules') &&
          !src.includes('tests') &&
          !src.includes('example') &&
          !src.includes('coverage')
        );
      },
    });
  }
}

async function copyChangelogFiles() {
  const buildDir = path.join(process.cwd(), 'build');
  const packagesDir = path.join(process.cwd(), 'packages', 'core');
  const packageDirs = await fs.readdir(packagesDir);

  for (const pkg of packageDirs) {
    const srcChangelogPath = path.join(packagesDir, pkg, 'CHANGELOG.md');
    const destChangelogPath = path.join(
      buildDir,
      'packages',
      'core',
      pkg,
      'CHANGELOG.md'
    );

    if (await fs.pathExists(srcChangelogPath)) {
      await fs.copy(srcChangelogPath, destChangelogPath);
    }
  }
}

(async () => {
  await copyPackagesToBuild();

  const { workspaceVersion, projectsVersionData } = await releaseVersion({
    verbose: true,
  });

  console.log('workspaceVersion', workspaceVersion);
  console.log('projectsVersionData', projectsVersionData);

  await releaseChangelog({
    versionData: projectsVersionData,
    version: workspaceVersion,
    verbose: true,
  });

  await copyChangelogFiles();

  const publishResult = await releasePublish({
    // registry: 'https://registry.npmjs.org/',
    registry: 'http://localhost:4873',
    access: 'public',
    verbose: true,
  });
  process.exit(
    Object.values(publishResult).every((result) => result.code === 0) ? 0 : 1
  );
})();
