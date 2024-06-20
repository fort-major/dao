#!/usr/bin/env bash

if [[ -z "$1" ]]; then
    echo "Must provide network name (dev OR ic)" 1>&2
    exit 1
fi

if [[ -z "$2" ]]; then
    echo "Must provide Sasha's principal" 1>&2
    exit 1
fi

network=$1
file_name="./backend/.env.$network"

sasha_principal=$2

source $file_name

dfx deploy --network=$network fmj --argument "(variant { Init = record { \
  token_symbol = \"FMJ\"; \
  token_name = \"Fort Major\"; \
  minting_account = record { owner = principal \"$APP_BANK_CANISTER_ID\"  }; \
  transfer_fee = 10_000; \
  metadata = vec {}; \
  initial_balances = vec {}; \
  archive_options = record { \
    num_blocks_to_archive = 2000; \
    trigger_threshold = 1000; \
    controller_id = principal \"$APP_VOTINGS_CANISTER_ID\"; \
  }; \
}})"

dfx deploy --network=$network humans --argument "(record { sasha = principal \"$sasha_principal\" })"

dfx deploy --network=$network bank --argument "()"
dfx deploy --network=$network tasks --argument "()"
dfx deploy --network=$network votings --argument "()"