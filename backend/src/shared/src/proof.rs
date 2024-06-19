use candid::{decode_args, CandidType, Principal};
use garde::Validate;
use ic_cbor::CertificateToCbor;
use ic_certificate_verification::VerifyCertificate;
use ic_certification::{Certificate, LookupResult};
use serde::Deserialize;

use crate::{
    humans::{
        api::GetProfileProofsResponse,
        types::{ProfileProof, PROOF_MARKER},
    },
    votings::types::ONE_HOUR_NS,
    DurationNs, TimestampNs, ENV_VARS,
};

const PROOF_TTL_NS: DurationNs = ONE_HOUR_NS * 8;

#[derive(CandidType, Deserialize, Validate)]
pub struct Proof {
    #[garde(skip)]
    cert_raw: Vec<u8>,
    #[garde(skip)]
    pub profile_proof: Option<ProfileProof>,
}

impl Proof {
    pub fn assert_valid_for(&mut self, caller: Principal, now: TimestampNs) -> Result<(), String> {
        let cert = self.get_cert()?;

        // verify that the certificate indeed comes from an IC's canister
        cert.verify(
            ENV_VARS.humans_canister_id.as_slice(),
            &ENV_VARS.ic_root_key,
        )
        .map_err(|e| e.to_string())?;

        // verify that the certificate is not expired
        if let LookupResult::Found(mut date_bytes) = cert.tree.lookup_path(&["time"]) {
            let timestamp_nanos =
                leb128::read::unsigned(&mut date_bytes).map_err(|e| e.to_string())?;

            if now > timestamp_nanos && (now - timestamp_nanos) >= PROOF_TTL_NS {
                return Err(format!("The proof has expired"));
            }
        }

        // verify that the certificate contains the expected response
        let get_profile_proof_response = match cert.tree.lookup_path([b"reply"]) {
            LookupResult::Found(blob) => {
                decode_args::<(GetProfileProofsResponse,)>(blob)
                    .map_err(|e| e.to_string())?
                    .0
            }
            _ => return Err(format!("Unable to find profile proof in the reply")),
        };

        if get_profile_proof_response.marker != PROOF_MARKER {
            return Err(format!("Invalid proof marker"));
        }

        // verify that the response is about the caller
        if get_profile_proof_response.proof.id != caller {
            return Err(format!("The caller is not the owner of the proof"));
        }

        self.profile_proof = Some(get_profile_proof_response.proof);

        Ok(())
    }

    fn get_cert(&self) -> Result<Certificate, String> {
        Certificate::from_cbor(&self.cert_raw).map_err(|e| e.to_string())
    }
}
