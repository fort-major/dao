import { createContext, useContext } from "solid-js";
import { Store, createStore } from "solid-js/store";
import { IChildren, TTimestamp } from "../utils/types";
import { ErrorCode, err } from "../utils/error";
import { useAuth } from "./auth";
import { newBankActor } from "../utils/backend";
import { E8s } from "../utils/math";
import {
  Principal,
  pairToStr,
  strToPair,
  unwrapPair,
  wrapPair,
} from "../utils/encoding";

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

type ExchangeRatesStore = Partial<Record<TPairStr, [TTimestamp, E8s][]>>;

export interface IBankStoreContext {
  exchangeRates: Store<ExchangeRatesStore>;
  fetchExchangeRates: () => Promise<void>;
  swapRewards: (pairStr: TPairStr, amount: E8s) => Promise<ISwapResponse>;
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
  const { anonymousAgent, assertReadyToFetch, assertAuthorized, agent } =
    useAuth();

  const [exchangeRates, setExchangeRates] = createStore<ExchangeRatesStore>();

  const fetchExchangeRates: IBankStoreContext["fetchExchangeRates"] =
    async () => {
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
      qty: amount.toBigInt(),
    });

    const r: ISwapResponse = {
      assetId: asset,
      qty: E8s.new(qty),
      blockIdx: block_idx,
    };

    return r;
  };

  return (
    <BankContext.Provider
      value={{
        exchangeRates,
        fetchExchangeRates,
        swapRewards,
      }}
    >
      {props.children}
    </BankContext.Provider>
  );
}
