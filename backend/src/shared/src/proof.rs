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
    }, ENV_VARS,
};

#[derive(CandidType, Deserialize, Validate)]
pub struct Proof {
    #[garde(skip)]
    cert_raw: Vec<u8>,
    #[garde(skip)]
    pub profile_proof: Option<ProfileProof>,
}

impl Proof {
    pub fn assert_valid_for(&mut self, caller: Principal) -> Result<(), String> {
        let cert = self.get_cert()?;

        cert.verify(
            ENV_VARS.humans_canister_id.as_slice(),
            &ENV_VARS.ic_root_key,
        )
        .map_err(|e| e.to_string())?;

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
