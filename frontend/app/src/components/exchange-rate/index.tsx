import { VotingId } from "@/declarations/votings/votings.did";
import { Btn } from "@components/btn";
import { E8sWidget, EE8sKind } from "@components/e8s-widget";
import { EIconKind, Icon } from "@components/icon";
import { QtyInput } from "@components/qty-input";
import { VotingWidget } from "@components/voting-widget";
import { useAuth } from "@store/auth";
import { TPairStr, useBank } from "@store/bank";
import { useVotings } from "@store/votings";
import { COLORS } from "@utils/colors";
import { encodeVotingId, strToPair, unwrapPair } from "@utils/encoding";
import { logInfo } from "@utils/error";
import { E8s } from "@utils/math";
import { Result } from "@utils/types";
import {
  createEffect,
  createMemo,
  createSignal,
  Match,
  onMount,
  Show,
  Switch,
} from "solid-js";

export interface IExchangeRateProps {
  pair: TPairStr;
  editable?: boolean;
}

export function ExchangeRate(props: IExchangeRateProps) {
  const { createBankSetExchangeRateVoting, votings, fetchVotings } =
    useVotings();
  const { exchangeRates, fetchExchangeRates } = useBank();
  const { isReadyToFetch } = useAuth();

  const [edited, setEdited] = createSignal(false);
  const [proposing, setProposing] = createSignal(false);
  const [newRate, setNewRate] = createSignal<Result<E8s, E8s>>(
    Result.Ok(E8s.zero())
  );

  const votingId = (): VotingId => ({
    // @ts-expect-error
    BankSetExchangeRate: [{ [pair().from]: null }, { [pair().into]: null }],
  });

  const voting = () => votings[encodeVotingId(votingId())];

  createEffect(() => {
    if (isReadyToFetch() && !voting()) {
      fetchVotings([votingId()]);
    }
  });

  const rate = () => {
    const history = exchangeRates[props.pair];
    if (!history) return undefined;

    const current = history[history.length - 1];

    return current[1];
  };
  const pair = createMemo(() => strToPair(props.pair));

  createEffect(() => {
    const r = rate();

    if (r) {
      setNewRate(Result.Ok(r));
    }
  });

  const handleEditClick = () => {
    setEdited(true);
  };

  const handleProposeClick = async () => {
    setEdited(false);

    const agreed = confirm(
      `Are you sure you want to start a voting to set new ${pair().from} -> ${
        pair().into
      } exchange rate to ${newRate().unwrapOk().toString()}?`
    );

    if (!agreed) {
      return;
    }

    setProposing(true);

    const [from, into] = unwrapPair(pair());
    const votingId = await createBankSetExchangeRateVoting(
      from,
      into,
      newRate().unwrapOk()
    );

    setProposing(false);
    await fetchVotings([votingId]);

    logInfo(`The voting has been created!`);
  };

  const handleRefresh = () => {
    fetchExchangeRates();
  };

  return (
    <div class="flex flex-col">
      <div class="flex items-center gap-2 px-2 h-[40px]">
        <Switch>
          <Match when={!edited()}>
            <div class="flex items-center gap-1">
              <E8sWidget minValue={E8s.one()} kind={pair().from as EE8sKind} />
              <p>=</p>
              <E8sWidget
                minValue={rate() ? rate()! : E8s.zero()}
                kind={pair().into as EE8sKind}
              />
            </div>
            <Show when={props.editable && !proposing()}>
              <Icon
                kind={EIconKind.Edit}
                onClick={handleEditClick}
                color={COLORS.gray[150]}
                class="cursor-pointer"
              />
            </Show>
          </Match>
          <Match when={edited()}>
            <div class="flex items-center gap-1">
              <E8sWidget minValue={E8s.one()} kind={pair().from as EE8sKind} />
              <p>=</p>
              <QtyInput
                value={newRate().unwrap()}
                onChange={setNewRate}
                symbol={pair().into}
              />
              <Btn
                icon={EIconKind.CheckRect}
                iconColor={COLORS.green}
                text="Propose"
                onClick={handleProposeClick}
                disabled={proposing()}
              />
            </div>
          </Match>
        </Switch>
      </div>
      <Show when={voting()}>
        <VotingWidget
          id={encodeVotingId(votingId())}
          kind="satisfaction"
          optionIdx={0}
          onRefreshEntity={handleRefresh}
        />
      </Show>
    </div>
  );
}
