mod bank;
mod canister_ids;
mod humans;
mod tasks;

#[ic_cdk::query]
fn greet(name: String) -> String {
    format!("Hello, {}!", name)
}
