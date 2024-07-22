# Fort Major

Fair, open, robust and transparent digital organization with an uplifting vibe.

## Docs

Our DAO is fully expressed via two entities:

* [tasks](./docs/tasks.md), which add some kind of value to our projects;
* humans, who manage, solve and evaluate the tasks.

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
