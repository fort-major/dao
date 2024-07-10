use candid::{CandidType, Deserialize, Principal};
use std::collections::{btree_map::Entry, BTreeMap, BTreeSet};

use crate::btreemap;

use super::{
    api::{
        FollowRequest, FollowResponse, GetDecisionTopicsRequest, GetDecisionTopicsResponse,
        GetFolloweesOfRequest, GetFolloweesOfResponse, GetFollowersOfRequest,
        GetFollowersOfResponse, GetLiquidDemocracyProofRequest, GetLiquidDemocracyProofResponse,
    },
    types::{
        DecisionTopic, DecisionTopicId, DecisionTopicSet, DelegationTreeNode,
        LIQUID_DEMOCRACY_PROOF_MARKER,
    },
};

pub const GENERAL_TOPIC_ID: DecisionTopicId = 0;
pub const DEVELOPMENT_TOPIC_ID: DecisionTopicId = 1;
pub const MARKETING_TOPIC_ID: DecisionTopicId = 2;
pub const DESIGN_TOPIC_ID: DecisionTopicId = 3;

#[derive(CandidType, Deserialize)]
pub struct LiquidDemocracyState {
    pub decision_topic_id_counter: DecisionTopicId,
    pub decision_topics: BTreeMap<DecisionTopicId, DecisionTopic>,
    pub followees_of: BTreeMap<Principal, BTreeSet<Principal>>,
    pub followers_of: BTreeMap<Principal, BTreeMap<Principal, DecisionTopicSet>>,
}

impl LiquidDemocracyState {
    pub fn new() -> Self {
        let general_topic = DecisionTopic {
            id: GENERAL_TOPIC_ID,
            name: String::from("Governance"),
            description: String::from("Runtime parameters. For example, what tokens are whitelisted in MSQ, what exchange rates are we using in FMJ swaps, etc."),
        };

        let development_topic = DecisionTopic {
            id: DEVELOPMENT_TOPIC_ID,
            name: String::from("Development"),
            description: String::from("Everything about the code. Probably GitHub-related."),
        };

        let marketing_topic = DecisionTopic {
            id: MARKETING_TOPIC_ID,
            name: String::from("Marketing"),
            description: String::from("Everything about public presence. Tasks of this topic are usually about making some kind of content for the public."),
        };

        let design_topic = DecisionTopic {
            id: DESIGN_TOPIC_ID,
            name: String::from("Design"),
            description: String::from("Everything about the UX and visuals. Figma and others."),
        };

        Self {
            decision_topic_id_counter: 4,
            decision_topics: btreemap! {
                GENERAL_TOPIC_ID => general_topic,
                DEVELOPMENT_TOPIC_ID => development_topic,
                MARKETING_TOPIC_ID => marketing_topic,
                DESIGN_TOPIC_ID => design_topic,
            },
            followees_of: BTreeMap::new(),
            followers_of: BTreeMap::new(),
        }
    }

    pub fn default_topicset() -> DecisionTopicSet {
        use DecisionTopicSet as S;

        S::or(
            S::it(GENERAL_TOPIC_ID),
            S::or(
                S::it(DEVELOPMENT_TOPIC_ID),
                S::or_it(MARKETING_TOPIC_ID, DESIGN_TOPIC_ID),
            ),
        )
    }

    pub fn follow(&mut self, req: FollowRequest, caller: Principal) -> FollowResponse {
        if let Some(topics) = req.topics {
            match self.followees_of.entry(caller) {
                Entry::Vacant(e) => {
                    let mut s = BTreeSet::new();
                    s.insert(req.followee);

                    e.insert(s);
                }
                Entry::Occupied(mut e) => {
                    e.get_mut().insert(req.followee);
                }
            };

            match self.followers_of.entry(req.followee) {
                Entry::Vacant(e) => {
                    let mut s = BTreeMap::new();
                    s.insert(caller, topics);

                    e.insert(s);
                }
                Entry::Occupied(mut e) => {
                    e.get_mut().insert(caller, topics);
                }
            };
        } else {
            if let Some(f) = self.followees_of.get_mut(&caller) {
                f.remove(&req.followee);
            }

            if let Some(f) = self.followers_of.get_mut(&req.followee) {
                f.remove(&caller);
            }
        }

        FollowResponse {}
    }

    pub fn get_followers_of(&self, req: GetFollowersOfRequest) -> GetFollowersOfResponse {
        let entries = req
            .ids
            .into_iter()
            .map(|id| {
                let mut root = DelegationTreeNode {
                    id,
                    topicset: Self::default_topicset(),
                    followers: Vec::new(),
                };

                let mut loop_check = BTreeSet::new();
                loop_check.insert(id);

                self.followers_of(&id, &mut root, &mut loop_check);

                root
            })
            .collect();

        GetFollowersOfResponse { entries }
    }

    pub fn get_followees_of(&self, req: GetFolloweesOfRequest) -> GetFolloweesOfResponse {
        let entries = req
            .ids
            .into_iter()
            .map(|id| {
                let mut result = BTreeMap::new();
                self.followees_of(&id, &mut result);

                result
            })
            .collect();

        GetFolloweesOfResponse { entries }
    }

    pub fn get_liquid_democracy_proof(
        &self,
        _req: GetLiquidDemocracyProofRequest,
        caller: Principal,
    ) -> GetLiquidDemocracyProofResponse {
        let mut root = DelegationTreeNode {
            id: caller,
            topicset: Self::default_topicset(),
            followers: Vec::new(),
        };

        let mut loop_check = BTreeSet::new();
        loop_check.insert(caller);

        self.followers_of(&caller, &mut root, &mut loop_check);

        GetLiquidDemocracyProofResponse {
            marker: LIQUID_DEMOCRACY_PROOF_MARKER.to_string(),
            tree_root: root,
        }
    }

    pub fn get_decision_topics(&self, _req: GetDecisionTopicsRequest) -> GetDecisionTopicsResponse {
        let entries = self.decision_topics.values().cloned().collect();

        GetDecisionTopicsResponse { entries }
    }

    fn generate_id(&mut self) -> DecisionTopicId {
        let id = self.decision_topic_id_counter;
        self.decision_topic_id_counter += 1;

        id
    }

    fn followers_of(
        &self,
        of: &Principal,
        parent: &mut DelegationTreeNode,
        loop_check: &mut BTreeSet<Principal>,
    ) {
        if let Some(followers) = self.followers_of.get(of) {
            for (follower, topicset) in followers {
                if loop_check.contains(follower) {
                    continue;
                }

                loop_check.insert(*follower);

                let mut child = DelegationTreeNode {
                    id: *follower,
                    topicset: topicset.clone(),
                    followers: Vec::new(),
                };
                self.followers_of(follower, &mut child, loop_check); // recursive invocation

                parent.followers.push(child);
            }
        }
    }

    fn followees_of(&self, of: &Principal, result: &mut BTreeMap<Principal, DecisionTopicSet>) {
        if let Some(followees) = self.followees_of.get(of) {
            for followee in followees {
                let topicset = self
                    .followers_of
                    .get(followee)
                    .expect("Unreacheable: followee followers list should not be empty")
                    .get(of)
                    .expect("Unreacheable: followee topicset should not be empty")
                    .clone();

                result.insert(*followee, topicset);
            }
        }
    }
}
