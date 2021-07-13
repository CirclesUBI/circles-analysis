# Releasing `circles-analysis`

Use this checklist to create a new release of `circles-analysis` and publish the NodeJS application to the public npm registry. All steps are intended to be run from the root directory of the repository.

## Creating a new release

1. Make sure you are currently on the `main` branch, otherwise run `git checkout main`.
2. `git pull` to make sure you haven’t missed any last-minute commits. After this point, nothing else is making it into this version.
3. `npm test` to ensure that all tests pass locally.
4. `git push` and verify all tests pass on all CI services.
5. Read the git history since the last release, for example via `git --no-pager log --oneline --no-decorate v0.4.0^..origin/main` (replace `v0.4.0` with the last published version).
6. Condense the list of changes into something user-readable and write it into the `CHANGELOG.md` file with the release date and version, following the specification here on [how to write a changelog](https://keepachangelog.com/en/1.0.0/). Make sure you add references to the regarding PRs and issues.
7. Commit the `CHANGELOG.md` changes you've just made.
8. Create a git and npm tag based on [semantic versioning](https://semver.org/) using `npm version [major | minor | patch]`.
9. `git push origin main --tags` to push the tag to GitHub.
10. `git push origin main` to push the automatic `package.json` change after creating the tag.
11. [Create](https://github.com/CirclesUBI/circles-analysis/releases/new) a new release on GitHub, select the tag you've just pushed under *"Tag version"* and use the same for the *"Release title"*. For *"Describe this release"* copy the same information you've entered in `CHANGELOG.md` for this release. See examples [here](https://github.com/CirclesUBI/circles-analysis/releases).

## Deploy package on npm

1. Make sure you have an [authenticated npm account](https://docs.npmjs.com/cli/v7/commands/npm-adduser) with permission to deploy the `@circles/analysis` package.
2. Run `npm publish` to finally release the package on npm.
