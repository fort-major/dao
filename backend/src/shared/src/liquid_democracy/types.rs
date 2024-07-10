use candid::{CandidType, Deserialize, Principal};
use garde::Validate;

pub type DecisionTopicId = u32;
pub const LIQUID_DEMOCRACY_PROOF_MARKER: &str =
    "FMJ LIQUID DEMOCRACY CANISTER GET LIQUID DEMOCRACY PROOF RESPONSE";

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct DecisionTopic {
    pub id: DecisionTopicId,
    pub name: String,
    pub description: String,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum DecisionTopicSet {
    It(DecisionTopicId),
    Not(Box<DecisionTopicSet>),
    And(Box<DecisionTopicSet>, Box<DecisionTopicSet>),
    Or(Box<DecisionTopicSet>, Box<DecisionTopicSet>),
}

impl DecisionTopicSet {
    pub fn matches(&self, topic_ids: &[DecisionTopicId]) -> bool {
        match &self {
            DecisionTopicSet::It(id) => topic_ids.contains(id),
            DecisionTopicSet::Not(s) => !s.matches(topic_ids),
            DecisionTopicSet::And(a, b) => a.matches(topic_ids) && b.matches(topic_ids),
            DecisionTopicSet::Or(a, b) => a.matches(topic_ids) || b.matches(topic_ids),
        }
    }

    pub fn it(id: DecisionTopicId) -> Self {
        Self::It(id)
    }

    pub fn not(set: DecisionTopicSet) -> Self {
        Self::Not(Box::new(set))
    }

    pub fn not_it(id: DecisionTopicId) -> Self {
        Self::not(Self::it(id))
    }

    pub fn or(a: DecisionTopicSet, b: DecisionTopicSet) -> Self {
        Self::Or(Box::new(a), Box::new(b))
    }

    pub fn or_it(a: DecisionTopicId, b: DecisionTopicId) -> Self {
        Self::or(Self::it(a), Self::it(b))
    }

    pub fn and(a: DecisionTopicSet, b: DecisionTopicSet) -> Self {
        Self::And(Box::new(a), Box::new(b))
    }

    pub fn and_it(a: DecisionTopicId, b: DecisionTopicId) -> Self {
        Self::and(Self::it(a), Self::it(b))
    }
}

#[derive(CandidType, Deserialize, Clone, Debug, Validate)]
pub struct DelegationTreeNode {
    #[garde(skip)]
    pub id: Principal,
    #[garde(skip)]
    pub topicset: DecisionTopicSet,
    #[garde(dive)]
    pub followers: Vec<DelegationTreeNode>,
}
