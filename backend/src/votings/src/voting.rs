use candid::Principal;

pub type VotingId = u64;

pub enum VotingKind {
    CustomCall {
        canister_id: Principal,
        method_name: String,
        args: Vec<u8>,
    },
    EmployHumans {
        humanIds: Vec<Principal>,
    },
    FireHumans {
        humanIds: Vec<Principal>,
    },
}

pub struct Voting {
    pub id: VotingId,
    pub title: String,
    pub description: String,
}
