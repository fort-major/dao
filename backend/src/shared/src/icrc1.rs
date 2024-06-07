use candid::Principal;
use ic_cdk::{api::call::CallResult, call};
use icrc_ledger_types::icrc1::transfer::{BlockIndex, TransferArg, TransferError};

pub struct ICRC1CanisterClient {
    pub canister_id: Principal,
}

impl ICRC1CanisterClient {
    pub fn new(canister_id: Principal) -> Self {
        Self { canister_id }
    }

    pub async fn icrc1_transfer(
        &self,
        arg: TransferArg,
    ) -> CallResult<(Result<BlockIndex, TransferError>,)> {
        call(self.canister_id, "icrc1_transfer", (arg,)).await
    }
}
