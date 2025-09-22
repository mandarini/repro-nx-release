# Nx Release issues

I would expect running `npm run release` to not update the local package.json file versions, and the [`packages/core/main/package.json`](packages/core/main/package.json) workspace depenencies to remain `*` instead of changing to the new released version.
