#!/usr/bin/env bash

if [[ -z "$1" ]]; then
    echo "Must provide network name (dev OR ic)" 1>&2
    exit 1
fi

mode=$1
if [ $mode = "dev" ]; then 
    network="local" 
else 
    network=$mode
fi
file_name="./backend/.env.$mode"

source $file_name

dfx deploy --network=$network fmj --argument "(variant { Init = record { \
  token_symbol = \"FMJ\"; \
  token_name = \"Fort Major\"; \
  minting_account = record { owner = principal \"$CAN_BANK_CANISTER_ID\"  }; \
  transfer_fee = 10_000; \
  fee_collector_account = opt record { owner = principal \"$CAN_BANK_CANISTER_ID\" }; \
  metadata = vec { record { \"icrc1:logo\"; variant { Text = \"data:image/png;base64,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\" } } }; \
  feature_flags = opt record { icrc2 = true }; \
  initial_balances = vec {}; \
  archive_options = record { \
    num_blocks_to_archive = 2000; \
    trigger_threshold = 1000; \
    controller_id = principal \"$CAN_VOTINGS_CANISTER_ID\" \
  }; \
}})"

dfx deploy --network=$network tasks --argument "(record { task_archive_canister_id = principal \"$(dfx canister --network=$network id task_archive)\" })"

dfx deploy --network=$network humans --argument "()"
dfx deploy --network=$network task_archive --argument "()"
dfx deploy --network=$network bank --argument "()"
dfx deploy --network=$network votings --argument "()"
dfx deploy --network=$network reputation --argument "()"
dfx deploy --network=$network liquid_democracy --argument "()"
