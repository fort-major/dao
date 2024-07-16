# Fort Major

Fair, open, robust and transparent digital organization with an uplifting vibe.

## Local development

* `dfx extension install nns`
* `dfx start --clean`
* `dfx extension run nns install`
* `./scripts/before-build.sh dev`
* `./scripts/generate-bind.sh`
* `./scripts/deploy.backend.sh dev`
* `cd ./frontend/app && pnpm run dev`

if you redeploying from scratch, don't forget to call `localStorage.clear()` in browser's dev console and reauthorize

### Automatic .did generation

* `./script/extract-did.sh`
