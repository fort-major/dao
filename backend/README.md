# Backend

## Deployment

### FMJ

```sh
export BANK_CANISTER_ID=$(dfx canister id bank)
export PRINCIPAL=$(dfx identity get-principal)

dfx deploy fmj --argument "(record {
  token_symbol = \"FMJ\";
  token_name = \"Fort Major\";
  minting_account = record { owner = principal \"$BANK_CANISTER_ID\"  };
  transfer_fee = 10_000;
  metadata = vec {};
  initial_balances = vec {};
  archive_options = record {
    num_blocks_to_archive = 2000;
    trigger_threshold = 1000;
    controller_id = principal \"$PRINCIPAL\";
  };
})"
```

