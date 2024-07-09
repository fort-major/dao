use candid::{CandidType, Deserialize};

pub type DecisionTopicId = u32;

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
}
