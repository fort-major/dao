import { Btn } from "@components/btn";
import { E8sWidget } from "@components/e8s-widget";
import { EIconKind, Icon } from "@components/icon";
import { QtyInput } from "@components/qty-input";
import { useAuth } from "@store/auth";
import { TPairStr } from "@store/bank";
import { useVotings } from "@store/votings";
import { COLORS } from "@utils/colors";
import { encodeVotingId, strToPair, unwrapPair } from "@utils/encoding";
import { err, ErrorCode, logInfo } from "@utils/error";
import { E8s } from "@utils/math";
import { createMemo, createSignal, Match, Show, Switch } from "solid-js";

export interface IExchangeRateProps {
  pair: TPairStr;
  rate: E8s;
  editable?: boolean;
}

export function ExchangeRate(props: IExchangeRateProps) {
  const { createBankSetExchangeRateVoting } = useVotings();

  const [edited, setEdited] = createSignal(false);
  const [rate, setRate] = createSignal(props.rate);
  const [proposing, setProposing] = createSignal(false);

  const pair = createMemo(() => strToPair(props.pair));

  const handleEditClick = () => {
    setEdited(true);
  };

  const handleEdit = (newRate: E8s | undefined) => {
    if (!newRate || newRate.eq(props.rate)) {
      setEdited(false);
      return;
    }

    setRate(newRate);
  };

  const handleProposeClick = async () => {
    setEdited(false);

    const agreed = confirm(
      `Are you sure you want to start a voting to set new ${pair().from} -> ${
        pair().into
      } exchange rate to ${rate().toString()}?`
    );

    if (!agreed) {
      setRate(props.rate);
      return;
    }

    setProposing(true);

    const [from, into] = unwrapPair(pair());
    const votingId = await createBankSetExchangeRateVoting(from, into, rate());

    setProposing(false);
    setRate(props.rate);

    logInfo(
      `The voting (${encodeVotingId(
        votingId
      )}) has been created! Navigate to decisions tab to vote.`
    );
  };

  return (
    <div class="flex items-center gap-2 px-2 h-[40px]">
      <Switch>
        <Match when={!edited()}>
          <div class="flex items-center gap-1">
            <E8sWidget
              value={E8s.one()}
              kind={pair().from as "Storypoints" | "Hours"}
            />
            <p>=</p>
            <E8sWidget value={props.rate} kind={pair().into as "FMJ" | "ICP"} />
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
            <E8sWidget
              value={E8s.one()}
              kind={pair().from as "Storypoints" | "Hours"}
            />
            <p>=</p>
            <QtyInput
              defaultValue={props.rate}
              onChange={handleEdit}
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
  );
}
