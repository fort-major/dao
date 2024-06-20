#!/usr/bin/env bash

rm -rf ./frontend/app/src/declarations && dfx generate && mv ./src/declarations ./frontend/app/src/declarations

rm ./frontend/app/src/declarations/bank/bank.did
rm ./frontend/app/src/declarations/fmj/fmj.did
rm ./frontend/app/src/declarations/humans/humans.did
rm ./frontend/app/src/declarations/tasks/tasks.did
rm ./frontend/app/src/declarations/votings/votings.did
rm -rf ./src