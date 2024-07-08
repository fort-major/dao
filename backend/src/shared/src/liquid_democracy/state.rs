use candid::{CandidType, Deserialize, Principal};
use std::collections::{btree_map::Entry, BTreeMap, BTreeSet};

use crate::btreemap;

use super::{
    api::{FollowRequest, FollowResponse, GetFollowersOfRequest, GetFollowersOfResponse},
    types::{DecisionTopic, DecisionTopicId, DecisionTopicSet},
};

#[derive(CandidType, Deserialize)]
pub struct LiquidDemocracyState {
    pub decision_topic_id_counter: DecisionTopicId,
    pub decision_topic: BTreeMap<DecisionTopicId, DecisionTopic>,
    pub i_follow: BTreeMap<Principal, BTreeSet<Principal>>,
    pub my_followers: BTreeMap<Principal, BTreeMap<Principal, DecisionTopicSet>>,
}

impl LiquidDemocracyState {
    pub fn new() -> Self {
        let general_topic = DecisionTopic {
            id: 0,
            name: String::from("Governance"),
            description: String::from("Runtime parameters. For example, what tokens are whitelisted in MSQ, what exchange rates are we using in FMJ swaps, etc."),
        };

        let development_topic = DecisionTopic {
            id: 1,
            name: String::from("Development"),
            description: String::from("Everything about the code. Probably GitHub-related."),
        };

        let marketing_topic = DecisionTopic {
            id: 2,
            name: String::from("Marketing"),
            description: String::from("Everything about public presence. Tasks of this topic are usually about making some kind of content for the public."),
        };

        let design_topic = DecisionTopic {
            id: 3,
            name: String::from("Design"),
            description: String::from("Everything about the UX and visuals. Figma and others."),
        };

        let fmj_topic = DecisionTopic {
            id: 4,
            name: String::from("Fort Major"),
            description: String::from(
                "Decisions related exclusively to the Fort Major organization itself.",
            ),
        };

        let msq_topic = DecisionTopic {
            id: 5,
            name: String::from("MSQ"),
            description: String::from("Decision related exclusively to the MSQ project."),
        };

        Self {
            decision_topic_id_counter: 6,
            decision_topic: btreemap! {
                0 => general_topic,
                1 => development_topic,
                2 => marketing_topic,
                3 => design_topic,
                4 => fmj_topic,
                5 => msq_topic,
            },
            i_follow: BTreeMap::new(),
            my_followers: BTreeMap::new(),
        }
    }

    pub fn follow(&mut self, req: FollowRequest, caller: Principal) -> FollowResponse {
        if let Some(topics) = req.topics {
            match self.i_follow.entry(caller) {
                Entry::Vacant(e) => {
                    let mut s = BTreeSet::new();
                    s.insert(req.followee);

                    e.insert(s);
                }
                Entry::Occupied(mut e) => {
                    e.get_mut().insert(req.followee);
                }
            };

            match self.my_followers.entry(req.followee) {
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
            if let Some(f) = self.i_follow.get_mut(&caller) {
                f.remove(&req.followee);
            }

            if let Some(f) = self.my_followers.get_mut(&req.followee) {
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
                let mut result = BTreeSet::new();
                self.followers_of(&id, &mut result);

                result
            })
            .collect();

        GetFollowersOfResponse { entries }
    }

    fn generate_id(&mut self) -> DecisionTopicId {
        let id = self.decision_topic_id_counter;
        self.decision_topic_id_counter += 1;

        id
    }

    fn followers_of(&self, of: &Principal, result: &mut BTreeSet<Principal>) {
        if let Some(followers) = self.my_followers.get(of) {
            for follower in followers.keys() {
                if result.contains(follower) {
                    continue;
                }

                result.insert(*follower);
                self.followers_of(follower, result); // recursive invocation
            }
        }
    }
}
