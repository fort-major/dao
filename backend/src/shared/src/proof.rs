use candid::{decode_args, CandidType, Principal};
use garde::Validate;
use ic_cbor::CertificateToCbor;
use ic_certificate_verification::VerifyCertificate;
use ic_certification::{Certificate, LookupResult};
use serde::Deserialize;

use crate::{
    humans::{
        api::GetProfileProofsResponse,
        types::{ProfileProof, PROFILE_PROOFS_MARKER},
    },
    reputation::{
        api::GetRepProofResponse,
        types::{ReputationProof, REPUTATION_PROOF_MARKER},
    },
    votings::types::ONE_HOUR_NS,
    DurationNs, TimestampNs, ENV_VARS,
};

const PROOF_TTL_NS: DurationNs = ONE_HOUR_NS * 8;

#[derive(CandidType, Deserialize, Validate)]
pub struct Proof {
    #[garde(skip)]
    pub profile_proofs_cert_raw: Vec<u8>,
    #[garde(skip)]
    pub profile_proof: Option<ProfileProof>,
    #[garde(skip)]
    pub reputation_proof_cert_raw: Vec<u8>,
    #[garde(skip)]
    pub reputation_proof: Option<ReputationProof>,
}

impl Proof {
    pub fn assert_valid_for(&mut self, caller: Principal, now: TimestampNs) -> Result<(), String> {
        let profile_proof_cert = self.get_profile_proofs_cert()?;
        let reputation_proof_cert = self.get_reputation_proof_cert()?;

        // verify that the certificate indeed comes from an IC's canister
        profile_proof_cert
            .verify(
                ENV_VARS.humans_canister_id.as_slice(),
                &ENV_VARS.ic_root_key,
            )
            .map_err(|e| e.to_string())?;

        reputation_proof_cert
            .verify(
                ENV_VARS.reputation_canister_id.as_slice(),
                &ENV_VARS.ic_root_key,
            )
            .map_err(|e| e.to_string())?;

        // verify that the certificate is not expired
        if let LookupResult::Found(mut date_bytes) = profile_proof_cert.tree.lookup_path(&["time"])
        {
            let timestamp_nanos =
                leb128::read::unsigned(&mut date_bytes).map_err(|e| e.to_string())?;

            if now > timestamp_nanos && (now - timestamp_nanos) >= PROOF_TTL_NS {
                return Err(format!("The profile proof has expired"));
            }
        }

        if let LookupResult::Found(mut date_bytes) =
            reputation_proof_cert.tree.lookup_path(&["time"])
        {
            let timestamp_nanos =
                leb128::read::unsigned(&mut date_bytes).map_err(|e| e.to_string())?;

            if now > timestamp_nanos && (now - timestamp_nanos) >= PROOF_TTL_NS {
                return Err(format!("The reputation proof has expired"));
            }
        }

        // verify that the certificate contains the expected response
        let get_profile_proof_response = match profile_proof_cert.tree.lookup_path([b"reply"]) {
            LookupResult::Found(blob) => {
                decode_args::<(GetProfileProofsResponse,)>(blob)
                    .map_err(|e| e.to_string())?
                    .0
            }
            _ => return Err(format!("Unable to find profile proof in the reply")),
        };

        if get_profile_proof_response.marker != PROFILE_PROOFS_MARKER {
            return Err(format!("Invalid profile proof marker"));
        }

        let get_reputation_proof_response = match reputation_proof_cert.tree.lookup_path([b"reply"])
        {
            LookupResult::Found(blob) => {
                decode_args::<(GetRepProofResponse,)>(blob)
                    .map_err(|e| e.to_string())?
                    .0
            }
            _ => return Err(format!("Unable to find reputation proof in the reply")),
        };

        if get_reputation_proof_response.marker != REPUTATION_PROOF_MARKER {
            return Err(format!("Inavalid reputation proof marker"));
        }

        // verify that the response is about the caller
        if get_profile_proof_response.proof.id != caller {
            return Err(format!("The caller is not the owner of the profile proof"));
        }

        if get_reputation_proof_response.proof.id != caller {
            return Err(format!(
                "The caller is not the owner of the reputation proof"
            ));
        }

        self.profile_proof = Some(get_profile_proof_response.proof);
        self.reputation_proof = Some(get_reputation_proof_response.proof);

        Ok(())
    }

    fn get_profile_proofs_cert(&self) -> Result<Certificate, String> {
        Certificate::from_cbor(&self.profile_proofs_cert_raw).map_err(|e| e.to_string())
    }

    fn get_reputation_proof_cert(&self) -> Result<Certificate, String> {
        Certificate::from_cbor(&self.reputation_proof_cert_raw).map_err(|e| e.to_string())
    }
}
