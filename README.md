# Nx Release issues

1. I would expect running `npm run release` to not update the local package.json file versions, and the [`packages/core/main/package.json`](packages/core/main/package.json) workspace dependencies to remain `*` instead of changing to the new released version.
2. I would expect updating `package.json` to bump the version of all packages.

## Repro steps

1. Clone

```bash
git clone git@github.com:mandarini/repro-nx-release.git
```

2. Install

```bash
npm i
```

3. Make a change in one of the packages
    
    For example go to [`packages/core/lib2/src/lib/lib2.js`](packages/core/lib2/src/lib/lib2.js) and add a log or something

4. Commit your changes with conventional commits

```bash
git commit -m 'fix: added a log'
```

5. Run release

```bash
npm run release
```

Since we're using the custom `release` script in [`scripts/release.ts`](scripts/release.ts) and have configured the `"packageRoot": "build/{projectRoot}"` in `nx.json`, I would expect that the actual `package.json` files of the projects remain unaffected by the version bumps, and keep the default release version, as explained [here](https://www.epicweb.dev/tutorials/versioning-and-releasing-npm-packages-with-nx/nx/managing-package-versioning-in-a-build-directory).

6. Install a new package or make a change in `package.json` or `package-lock.json`
7. Commit with conventional commits
8. Run `npm run release`. It says "no changes detected". I must have misconfigured some inputs, but I am not sure how to configure this!