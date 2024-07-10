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

# check if canisters are created

dfx canister --network=$network create --all

# put env vars into backend

file_backend="./backend/.env.$mode"
rm -f $file_backend
touch $file_backend

echo "CAN_BANK_CANISTER_ID=\"$(dfx canister --network=$network id bank)\"" >> $file_backend
echo "CAN_HUMANS_CANISTER_ID=\"$(dfx canister --network=$network id humans)\"" >> $file_backend
echo "CAN_TASKS_CANISTER_ID=\"$(dfx canister --network=$network id tasks)\"" >> $file_backend
echo "CAN_VOTINGS_CANISTER_ID=\"$(dfx canister --network=$network id votings)\"" >> $file_backend
echo "CAN_REPUTATION_CANISTER_ID=\"$(dfx canister --network=$network id reputation)\"" >> $file_backend
echo "CAN_LIQUID_DEMOCRACY_CANISTER_ID=\"$(dfx canister --network=$network id liquid_democracy)\"" >> $file_backend
echo "CAN_FMJ_CANISTER_ID=\"$(dfx canister --network=$network id fmj)\"" >> $file_backend
echo "CAN_ICP_CANISTER_ID=\"ryjl3-tyaaa-aaaaa-aaaba-cai\"" >> $file_backend
echo "CAN_ROOT_KEY=\"$(dfx ping $network | grep -oP '(?<="root_key": )\[.*\]')\"" >> $file_backend

mkdir -p /tmp/fmj

sed "1 c const MODE: &str = \"$mode\";" ./backend/src/shared/build.rs >> /tmp/fmj/build.rs
mv /tmp/fmj/build.rs ./backend/src/shared/build.rs

# pub env vars into frontend

file_frontend="./frontend/app/.env.$mode"
rm -f $file_frontend
touch $file_frontend

echo "VITE_BANK_CANISTER_ID=\"$(dfx canister --network=$network id bank)\"" >> $file_frontend
echo "VITE_HUMANS_CANISTER_ID=\"$(dfx canister --network=$network id humans)\"" >> $file_frontend
echo "VITE_TASKS_CANISTER_ID=\"$(dfx canister --network=$network id tasks)\"" >> $file_frontend
echo "VITE_VOTINGS_CANISTER_ID=\"$(dfx canister --network=$network id votings)\"" >> $file_frontend
echo "VITE_REPUTATION_CANISTER_ID=\"$(dfx canister --network=$network id reputation)\"" >> $file_frontend
echo "VITE_LIQUID_DEMOCRACY_CANISTER_ID=\"$(dfx canister --network=$network id liquid_democracy)\"" >> $file_frontend
echo "VITE_FMJ_CANISTER_ID=\"$(dfx canister --network=$network id fmj)\"" >> $file_frontend
echo "VITE_ICP_CANISTER_ID=\"ryjl3-tyaaa-aaaaa-aaaba-cai\"" >> $file_frontend
echo "VITE_ROOT_KEY=\"$(dfx ping $network | grep -oP '(?<="root_key": )\[.*\]')\"" >> $file_frontend

if [ $mode = dev ]; then
    echo "VITE_IC_HOST=\"http://localhost:$(dfx info webserver-port)\"" >> $file_frontend
else
    echo "VITE_IC_HOST=\"https://icp-api.io\"" >> $file_frontend
fi
