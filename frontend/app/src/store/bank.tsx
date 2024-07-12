import {
  Accessor,
  createContext,
  createEffect,
  createSignal,
  Setter,
  useContext,
} from "solid-js";
import { Store, createStore } from "solid-js/store";
import { IChildren, TTimestamp } from "../utils/types";
import { ErrorCode, err } from "../utils/error";
import { useAuth } from "./auth";
import {
  FmjActor,
  newBankActor,
  newFmjActor,
  newIcpActor,
} from "../utils/backend";
import { E8s } from "../utils/math";
import {
  Principal,
  debugStringify,
  pairToStr,
  strToPair,
  unwrapPair,
  wrapPair,
} from "../utils/encoding";
import { nowNs } from "@components/countdown";

export interface IPair {
  from: string;
  into: string;
}

export type TPairStr = string;

export interface ISwapResponse {
  assetId: Principal;
  blockIdx: bigint;
  qty: E8s;
}

export interface IFmjStats {
  totalSupply: E8s;
  avgMonthlyInflation: E8s;
}

type ExchangeRatesStore = Partial<Record<TPairStr, [TTimestamp, E8s][]>>;

export interface IBankStoreContext {
  exchangeRates: Store<ExchangeRatesStore>;
  swapRewards: (pairStr: TPairStr, amount: E8s) => Promise<ISwapResponse>;
  transfer: (
    token: "ICP" | "FMJ",
    amount: E8s,
    to: Principal
  ) => Promise<bigint>;
  fmjStats: Accessor<IFmjStats>;
}

const BankContext = createContext<IBankStoreContext>();

export function useBank(): IBankStoreContext {
  const ctx = useContext(BankContext);

  if (!ctx) {
    err(ErrorCode.UNREACHEABLE, "Bank context is not initialized");
  }

  return ctx;
}

export function BankStore(props: IChildren) {
  const {
    anonymousAgent,
    assertReadyToFetch,
    isReadyToFetch,
    assertAuthorized,
    agent,
  } = useAuth();

  const [exchangeRates, setExchangeRates] = createStore<ExchangeRatesStore>();
  const [fmjStats, setFmjStats] = createSignal<IFmjStats>({
    totalSupply: E8s.zero(),
    avgMonthlyInflation: E8s.zero(),
  });

  createEffect(() => {
    if (isReadyToFetch()) {
      fetchFmjStats();
      fetchExchangeRates();
    }
  });

  const fetchFmjStats = async () => {
    assertReadyToFetch();

    const bankActor = newBankActor(anonymousAgent()!);

    const { total_supply, avg_monthly_inflation } =
      await bankActor.bank__get_fmj_stats({});

    setFmjStats({
      totalSupply: E8s.new(total_supply),
      avgMonthlyInflation: E8s.new(avg_monthly_inflation),
    });
  };

  const fetchExchangeRates = async () => {
    assertReadyToFetch();

    const bankActor = newBankActor(anonymousAgent()!);
    const { exchange_rates } = await bankActor.bank__get_exchange_rates({});

    for (let [from, into, history] of exchange_rates) {
      const pair = wrapPair(from, into);

      setExchangeRates(
        pairToStr(pair),
        history.map(([timestamp, rate]) => [timestamp, E8s.new(rate)])
      );
    }
  };

  const swapRewards: IBankStoreContext["swapRewards"] = async (
    pairStr,
    amount
  ) => {
    assertAuthorized();

    const [from, into] = unwrapPair(strToPair(pairStr));

    const bankActor = newBankActor(agent()!);
    const { qty, asset, block_idx } = await bankActor.bank__swap_rewards({
      from,
      into,
      qty: amount.toBigIntRaw(),
    });

    const r: ISwapResponse = {
      assetId: asset,
      qty: E8s.new(qty),
      blockIdx: block_idx,
    };

    return r;
  };

  const transfer: IBankStoreContext["transfer"] = async (token, qty, to) => {
    assertAuthorized();

    let actor: FmjActor;

    if (token === "ICP") {
      actor = newIcpActor(agent()!);
    } else {
      actor = newFmjActor(agent()!);
    }

    const result = await actor.icrc1_transfer({
      to: { owner: to, subaccount: [] },
      amount: qty.toBigIntRaw(),
      fee: [],
      memo: [],
      from_subaccount: [],
      created_at_time: [nowNs()],
    });

    if ("Err" in result) {
      err(ErrorCode.ICRC1, debugStringify(result.Err));
    }

    return result.Ok;
  };

  return (
    <BankContext.Provider
      value={{
        exchangeRates,
        swapRewards,
        transfer,
        fmjStats,
      }}
    >
      {props.children}
    </BankContext.Provider>
  );
}
