#!/usr/bin/env bash

if [[ -z "$1" ]]; then
    echo "Must provide network name (local OR ic)" 1>&2
    exit 1
fi

network=$1
file_name="$network.env"

dfx canister --network=$network create --all

rm -f $file_name
touch $file_name

echo "APP_BANK_CANISTER_ID=\"$(dfx canister --network=$network id bank)\"" >> $file_name
echo "APP_HUMANS_CANISTER_ID=\"$(dfx canister --network=$network id humans)\"" >> $file_name
echo "APP_TASKS_CANISTER_ID=\"$(dfx canister --network=$network id tasks)\"" >> $file_name
echo "APP_VOTINGS_CANISTER_ID=\"$(dfx canister --network=$network id votings)\"" >> $file_name
echo "APP_FMJ_CANISTER_ID=\"$(dfx canister --network=$network id fmj)\"" >> $file_name
echo "APP_ICP_CANISTER_ID=\"ryjl3-tyaaa-aaaaa-aaaba-cai\"" >> $file_name
echo "APP_ROOT_KEY=\"$(dfx ping $network | grep -oP '(?<="root_key": )\[.*\]')\"" >> $file_name

mkdir -p /tmp/fmj

sed "1 c const PREFIX: &str = \"$network\";" ./src/shared/build.rs >> /tmp/fmj/build.rs
mv /tmp/fmj/build.rs ./src/shared/build.rs