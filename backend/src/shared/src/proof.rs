use std::{cell::RefCell, collections::BTreeMap, fmt::Debug, num::NonZeroUsize, time::Duration};

use candid::{decode_args, CandidType, Nat, Principal};
use garde::Validate;
use ic_cbor::CertificateToCbor;
use ic_cdk_timers::set_timer_interval;
use ic_certificate_verification::VerifyCertificate;
use ic_certification::{hash_tree::HashTree, Certificate, LookupResult};
use lru::LruCache;
use serde::{de::DeserializeOwned, Deserialize};
use sha2::Digest;

use crate::{
    e8s::E8s,
    humans::{
        api::GetProfileProofsResponse,
        types::{ProfileProofBody, PROFILE_PROOFS_MARKER},
    },
    liquid_democracy::{
        api::GetLiquidDemocracyProofResponse,
        types::{DelegationTreeNode, LIQUID_DEMOCRACY_PROOF_MARKER},
    },
    reputation::{
        api::GetRepProofResponse,
        types::{ReputationProofBody, REPUTATION_PROOF_MARKER},
    },
    votings::types::{ONE_DAY_NS, ONE_HOUR_NS, ONE_MINUTE_NS},
    DurationNs, TimestampNs, ENV_VARS,
};

const PROOF_TTL_NS: DurationNs = ONE_HOUR_NS * 8;
const REQUEST_STATUS_BYTES: [u8; 14] = [
    114, 101, 113, 117, 101, 115, 116, 95, 115, 116, 97, 116, 117, 115,
];
const REQUEST_STATUS_PATH: &[u8] = b"request_status";
const REPLY_PATH: &[u8] = b"reply";

#[derive(CandidType, Deserialize, Validate)]
pub struct ReputationProof {
    #[garde(skip)]
    pub cert_raw: Vec<u8>,
    #[garde(skip)]
    pub body: Option<ReputationProofBody>,
}

impl ReputationProof {
    pub fn assert_valid_for(&mut self, caller: Principal, now: TimestampNs) -> Result<(), String> {
        // verify that the certificate contains the expected response
        let get_reputation_proof_response = verify_and_decode::<GetRepProofResponse>(
            &self.cert_raw,
            &ENV_VARS.reputation_canister_id,
            now,
        )?;

        if get_reputation_proof_response.marker != REPUTATION_PROOF_MARKER {
            return Err(format!("Inavalid reputation proof marker"));
        }

        // verify that the response is about the caller
        if get_reputation_proof_response
            .proof
            .reputation_delegation_tree
            .id
            != caller
        {
            return Err(format!(
                "The caller is not the owner of the reputation proof"
            ));
        }

        self.body = Some(get_reputation_proof_response.proof);

        Ok(())
    }

    pub fn rep_reliant_action_can_be_done(&self, caller: Principal, now: TimestampNs) -> bool {
        let callers_own_reputation = &self
            .body
            .as_ref()
            .unwrap()
            .reputation_delegation_tree
            .reputation;

        let task_cooldown_opt = rep_to_cooldown_ns(callers_own_reputation);

        if let Some(task_cooldown_ns) = task_cooldown_opt {
            let last_task_created_at = last_reputation_reliant_action_at(&caller);
            let time_elapsed_since_last_task_created_ns = now - last_task_created_at;

            if time_elapsed_since_last_task_created_ns >= task_cooldown_ns {
                mark_reputation_reliant_action(caller, now);

                return true;
            }
        }

        false
    }
}

/*
    Task creation and voting creation are actions which require you to either be a team member or to posses
    a certain amount of reputation. In the second case, there is a cooldown on your action, depending on how
    much reputation do you have.

    These functions allow any canister to implement this functionality. See task creation or voting creation for an example.
*/

pub fn rep_to_cooldown_ns(rep: &E8s) -> Option<u64> {
    if &rep.0 >= &Nat::from(500_0000_0000u64) {
        return Some(0);
    }

    if &rep.0 >= &Nat::from(100_0000_0000u64) {
        return Some(ONE_MINUTE_NS * 10);
    }

    if &rep.0 >= &Nat::from(50_0000_0000u64) {
        return Some(ONE_HOUR_NS);
    }

    if &rep.0 >= &Nat::from(20_0000_0000u64) {
        return Some(ONE_DAY_NS);
    }

    None
}

thread_local! {
    // FIXME: actions will interfere, if more than one distinct action per canister
    static REPUTATION_RELIANT_ACTION_TIMESTAMP: RefCell<BTreeMap<Principal, u64>> = RefCell::default();
}

pub fn mark_reputation_reliant_action(of: Principal, now: u64) {
    REPUTATION_RELIANT_ACTION_TIMESTAMP.with_borrow_mut(|c| c.insert(of, now));
}

pub fn last_reputation_reliant_action_at(of: &Principal) -> u64 {
    REPUTATION_RELIANT_ACTION_TIMESTAMP.with_borrow_mut(|c| c.get(of).cloned().unwrap_or_default())
}

pub fn start_cleanup_interval_for_rep_reliant_actions() {
    set_timer_interval(Duration::from_nanos(ONE_DAY_NS), || {
        REPUTATION_RELIANT_ACTION_TIMESTAMP.with_borrow_mut(|c| c.clear());
    });
}

#[derive(CandidType, Deserialize, Validate)]
pub struct ProfileProof {
    #[garde(skip)]
    pub cert_raw: Vec<u8>,
    #[garde(skip)]
    pub body: Option<ProfileProofBody>,
}

impl ProfileProof {
    pub fn assert_valid_for(&mut self, caller: Principal, now: TimestampNs) -> Result<(), String> {
        // verify that the certificate contains the expected response
        let get_proof_response = verify_and_decode::<GetProfileProofsResponse>(
            &self.cert_raw,
            &ENV_VARS.humans_canister_id,
            now,
        )?;

        if get_proof_response.marker != PROFILE_PROOFS_MARKER {
            return Err(format!("Invalid profile proof marker"));
        }

        // verify that the response is about the caller
        if get_proof_response.proof.id != caller {
            return Err(format!("The caller is not the owner of the profile proof"));
        }

        self.body = Some(get_proof_response.proof);

        Ok(())
    }
}

#[derive(CandidType, Deserialize, Validate, Clone, Debug)]
pub struct LiquidDemocracyProof {
    #[garde(skip)]
    pub cert_raw: Vec<u8>,
    #[garde(skip)]
    pub body: Option<DelegationTreeNode>,
}

impl LiquidDemocracyProof {
    pub fn assert_valid_for(&mut self, caller: Principal, now: TimestampNs) -> Result<(), String> {
        // verify that the certificate contains the expected response
        let get_proof_response = verify_and_decode::<GetLiquidDemocracyProofResponse>(
            &self.cert_raw,
            &ENV_VARS.liquid_democracy_canister_id,
            now,
        )?;

        if get_proof_response.marker != LIQUID_DEMOCRACY_PROOF_MARKER {
            return Err(format!("Invalid liquid democracy proof marker"));
        }

        // verify that the response is about the caller
        if get_proof_response.tree_root.id != caller {
            return Err(format!(
                "The caller is not the owner of the liquid democracy proof"
            ));
        }

        self.body = Some(get_proof_response.tree_root);

        Ok(())
    }
}

fn verify_and_decode<T: CandidType + DeserializeOwned + Debug>(
    cert_raw: &[u8],
    issuer_id: &Principal,
    now: u64,
) -> Result<T, String> {
    let cert = Certificate::from_cbor(&cert_raw).map_err(|e| e.to_string())?;
    let request_id = request_id_of(&cert.tree)?;

    // check cache
    let proof_hash = hash_cert(cert_raw);
    if !cache_has(&proof_hash) {
        // verify that the certificate indeed comes from an IC's canister
        cert.verify(issuer_id.as_slice(), &ENV_VARS.ic_root_key)
            .map_err(|e| e.to_string())?;

        // only put if verify is good
        cache_put(proof_hash, cert_raw.to_vec());
    }

    // verify that the certificate is not expired
    if let LookupResult::Found(mut date_bytes) = cert.tree.lookup_path(&["time"]) {
        let timestamp_nanos = leb128::read::unsigned(&mut date_bytes).map_err(|e| e.to_string())?;

        if now > timestamp_nanos && (now - timestamp_nanos) >= PROOF_TTL_NS {
            return Err(format!("The liquid democracy proof has expired"));
        }
    } else {
        return Err(format!("Unable to find 'time' field in the certificate"));
    }

    // verify that the certificate contains the expected response

    let res = match cert
        .tree
        .lookup_path([REQUEST_STATUS_PATH, &request_id, REPLY_PATH])
    {
        LookupResult::Found(blob) => decode_args::<(T,)>(blob).map_err(|e| e.to_string())?.0,
        _ => {
            return Err(format!(
                "Unable to find liquid democracy proof in the reply"
            ))
        }
    };

    Ok(res)
}

fn request_id_of(tree: &HashTree<Vec<u8>>) -> Result<Vec<u8>, String> {
    Ok(tree
        .list_paths()
        .iter()
        .find(|path| path[0].as_bytes() == &REQUEST_STATUS_BYTES)
        .ok_or(format!("Can't find reply status in the certificate"))?
        .get(1)
        .expect("Unreacheable")
        .as_bytes()
        .to_vec())
}

thread_local! {
    static CACHE: RefCell<lru::LruCache<[u8; 32], Vec<u8>>> = RefCell::new(LruCache::new(NonZeroUsize::new(256).unwrap()));
}

fn cache_put(proof_hash: [u8; 32], proof: Vec<u8>) {
    CACHE.with_borrow_mut(|c| c.put(proof_hash, proof));
}

fn cache_has(proof_hash: &[u8; 32]) -> bool {
    CACHE.with_borrow_mut(|c| c.contains(proof_hash))
}

fn hash_cert(cert_raw: &[u8]) -> [u8; 32] {
    let mut hasher = sha2::Sha256::new();
    hasher.update(cert_raw);

    hasher.finalize().into()
}
