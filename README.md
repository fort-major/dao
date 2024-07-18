# Fort Major

# TODO
* make stars work properly
* purge old data when new is requested

Fair, open, robust and transparent digital organization with an uplifting vibe.

## Local development

### Requirements

* `dfx 0.20.1`
* `candid-extractor`
* `pnpm`

### Instructions

* `dfx extension install nns`
* `dfx start --clean`
* `dfx extension run nns install`
* `./scripts/before-build.sh dev`
* `./scripts/generate-bind.sh`
* `./scripts/deploy.backend.sh dev`
* `cd ./frontend/app && pnpm run dev`

if you redeploying, don't forget to call `localStorage.clear()` in browser's dev console and reauthorize, otherwise you might see a "Signature Verification Failed" message

### Automatic .did generation

* `./script/extract-did.sh`
