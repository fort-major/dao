#!/usr/bin/env bash

rm -rf ../frontend/app/src/declarations && dfx generate && mv ./src/declarations ../frontend/app/src/declarations