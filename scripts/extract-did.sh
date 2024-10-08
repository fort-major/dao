#!/usr/bin/env bash

function generate_did() {
  local canister=$1
  local canister_root="./backend/src/can_$canister"

  cargo build --manifest-path="$canister_root/Cargo.toml" \
      --target wasm32-unknown-unknown \
      --release --locked --package "$canister" && \
  candid-extractor "./target/wasm32-unknown-unknown/release/$canister.wasm" > "$canister_root/can.did"
}

cargo fix --all --allow-dirty

generate_did "humans"
generate_did "votings"
generate_did "reputation"
generate_did "tasks"
generate_did "task_archive"
generate_did "bank"
generate_did "liquid_democracy"
generate_did "work_reports"
