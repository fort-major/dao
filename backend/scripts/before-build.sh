#!/usr/bin/env bash

if [[ -z "$1" ]]; then
    echo "Must provide network name (local OR ic)" 1>&2
    exit 1
fi

network=$1

# check if canisters are created

dfx canister --network=$network create --all

# put env vars into backend

file_backend="$network.env"
rm -f $file_backend
touch $file_backend

echo "APP_BANK_CANISTER_ID=\"$(dfx canister --network=$network id bank)\"" >> $file_backend
echo "APP_HUMANS_CANISTER_ID=\"$(dfx canister --network=$network id humans)\"" >> $file_backend
echo "APP_TASKS_CANISTER_ID=\"$(dfx canister --network=$network id tasks)\"" >> $file_backend
echo "APP_VOTINGS_CANISTER_ID=\"$(dfx canister --network=$network id votings)\"" >> $file_backend
echo "APP_FMJ_CANISTER_ID=\"$(dfx canister --network=$network id fmj)\"" >> $file_backend
echo "APP_ICP_CANISTER_ID=\"ryjl3-tyaaa-aaaaa-aaaba-cai\"" >> $file_backend
echo "APP_ROOT_KEY=\"$(dfx ping $network | grep -oP '(?<="root_key": )\[.*\]')\"" >> $file_backend

mkdir -p /tmp/fmj

sed "1 c const PREFIX: &str = \"$network\";" ./src/shared/build.rs >> /tmp/fmj/build.rs
mv /tmp/fmj/build.rs ./src/shared/build.rs

# pub env vars into frontend

file_frontend="../frontend/app/$network.env"
rm -f $file_frontend
touch $file_frontend

echo "VITE_BANK_CANISTER_ID=\"$(dfx canister --network=$network id bank)\"" >> $file_frontend
echo "VITE_HUMANS_CANISTER_ID=\"$(dfx canister --network=$network id humans)\"" >> $file_frontend
echo "VITE_TASKS_CANISTER_ID=\"$(dfx canister --network=$network id tasks)\"" >> $file_frontend
echo "VITE_VOTINGS_CANISTER_ID=\"$(dfx canister --network=$network id votings)\"" >> $file_frontend
echo "VITE_FMJ_CANISTER_ID=\"$(dfx canister --network=$network id fmj)\"" >> $file_frontend
echo "VITE_ICP_CANISTER_ID=\"ryjl3-tyaaa-aaaaa-aaaba-cai\"" >> $file_frontend
echo "VITE_ROOT_KEY=\"$(dfx ping $network | grep -oP '(?<="root_key": )\[.*\]')\"" >> $file_frontend
