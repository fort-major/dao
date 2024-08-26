#!/usr/bin/env bash

rm -rf ./frontend/app/src/declarations && \
dfx generate bank && \
dfx generate fmj && \
dfx generate humans && \
dfx generate tasks && \
dfx generate task_archive && \
dfx generate votings && \
dfx generate reputation && \
dfx generate liquid_democracy && \
dfx generate work_reports && \
mv ./src/declarations ./frontend/app/src/declarations && \
rm ./frontend/app/src/declarations/bank/bank.did && \
rm ./frontend/app/src/declarations/fmj/fmj.did && \
rm ./frontend/app/src/declarations/humans/humans.did && \
rm ./frontend/app/src/declarations/tasks/tasks.did && \
rm ./frontend/app/src/declarations/task_archive/task_archive.did && \
rm ./frontend/app/src/declarations/votings/votings.did && \
rm ./frontend/app/src/declarations/reputation/reputation.did && \
rm ./frontend/app/src/declarations/liquid_democracy/liquid_democracy.did && \
rm ./frontend/app/src/declarations/work_reports/work_reports.did && \
rm -rf ./src
