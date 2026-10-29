# Delivery: how a change reaches main and npm

A branch per change, `<type>/<issue>/<slug>` (`feat/1/publish-packages`), and
one pull request each. CI runs lint, typecheck and the tests, including the
check on the packed packages. A person merges: an agent never merges on its own.

## Releasing

npm publishing happens in CI only, with the one exception of a new package's
placeholder (below). One release publishes every package of `packages/` that
is not private, all at one version.

1. `node scripts/packages-version.mts set X.Y.Z` and commit
   `chore(release): X.Y.Z` on `main`.
2. `gh release create vX.Y.Z --generate-notes`.

Publishing the GitHub Release starts `.github/workflows/release.yml`: it checks
that the tag is every package's version, runs lint, typecheck and the tests,
and publishes each package through npm trusted publishing (OIDC, provenance,
no npm token), skipping a version npm already has.

**A dry run** is a pre-release: set `X.Y.Z-rc.N` on a branch, push it, and
`gh release create vX.Y.Z-rc.N --prerelease --target <branch>`. Every check
runs and `npm publish --dry-run` reads each tarball; nothing reaches npm.
Delete the pre-release, its tag and the branch afterwards.

**A new package** reaches npm by hand once, before the release that first
carries it, because npm configures a trusted publisher only on a package that
exists:

1. From the package directory, logged in to npm with publish rights on the
   `@lntt` scope:
   `npm publish --access public` with version `0.0.0`. The placeholder only
   reserves the name and is never installed.
2. On the package's page on npmjs.com, Settings → Trusted publishing:
   repository `LunetteOrg/playbook-framework`, workflow `release.yml`, with
   **allow `npm publish`** ticked.
3. Run the first release within two days: an unused trusted publisher
   configuration expires.
