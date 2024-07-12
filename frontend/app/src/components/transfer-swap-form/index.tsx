import { Btn } from "@components/btn";
import { E8sWidget, EE8sKind } from "@components/e8s-widget";
import { ExchangeRate } from "@components/exchange-rate";
import { FromInput } from "@components/from-input";
import { EIconKind } from "@components/icon";
import { PriceChart } from "@components/price-chart";
import { Select } from "@components/select";
import { TextInput } from "@components/text-input";
import { Title } from "@components/title";
import { Principal } from "@dfinity/principal";
import { debugStringify } from "@fort-major/msq-shared";
import { useAuth } from "@store/auth";
import { useBank } from "@store/bank";
import { COLORS } from "@utils/colors";
import { pairToStr } from "@utils/encoding";
import { err, ErrorCode } from "@utils/error";
import { E8s } from "@utils/math";
import { Result } from "@utils/types";
import { createResource, createSignal, from, Match, Switch } from "solid-js";

export interface ITransferSwapFormProps {}

export function TransferSwapForm(props: ITransferSwapFormProps) {
  const { myBalance, profileProof } = useAuth();
  const { transfer, swapRewards, exchangeRates } = useBank();

  const [profProof] = createResource(profileProof);
  const [from, setFrom] = createSignal(EE8sKind.Hour);
  const [into, setInto] = createSignal(EE8sKind.FMJ);
  const [amount, setAmount] = createSignal<Result<E8s, E8s>>(
    Result.Ok(E8s.zero())
  );
  const [transferRecipient, setTransferRecipient] = createSignal<
    Result<string, string>
  >(Result.Ok(""));
  const [disabled, setDisabled] = createSignal(false);

  const balance = () => {
    const b = myBalance();

    if (b) {
      return b[from()];
    } else {
      return E8s.zero();
    }
  };

  const amountToTransfer = () => {
    const a = amount();

    if (a.isErr()) return E8s.zero();

    const fee = E8s.new(1000n);
    const am = a.unwrapOk();

    if (am.le(fee)) return E8s.zero();

    return am.sub(fee);
  };

  const mode = () => {
    if (from() === EE8sKind.Hour || from() === EE8sKind.Storypoint)
      return "swap";
    if (from() === EE8sKind.FMJ || from() === EE8sKind.ICP) return "transfer";

    err(ErrorCode.UNREACHEABLE, `Unexpected token ${debugStringify(from())}`);
  };

  const canTransfer = () =>
    mode() === "transfer" &&
    transferRecipient() &&
    amount().isOk() &&
    amount().unwrap().toBool();

  const canSwap = () => mode() === "swap" && into() && intoAmount().toBool();

  const handleTransfer = async () => {
    const a = amount().unwrapOk();
    const at = amountToTransfer()!;
    const recipient = transferRecipient()!;

    if (recipient.isErr()) {
      alert("Invalid recipient principal ID");
      return;
    }

    const agreed = confirm(
      `Are you sure you want to transfer ${at.toString()} total ${from()} to ${recipient.unwrapOk()}? This action can't be reversed.`
    );

    if (!agreed) return;

    setDisabled(true);
    await transfer(
      from() as "ICP" | "FMJ",
      a,
      Principal.fromText(recipient.unwrapOk())
    );
    setDisabled(false);

    alert("Successful transfer");
  };

  const handleSelectInto = (into: Result<string, string>) => {
    setInto(into.unwrap() as EE8sKind);
  };

  const exchangeRate = () => {
    const history = exchangeRates[pairToStr({ from: from(), into: into() })];

    if (!history) return E8s.zero();

    return history[history.length - 1][1];
  };

  const intoAmount = () => {
    const a = amount();

    if (a.isErr()) return E8s.zero();

    return a.unwrapOk().mul(exchangeRate());
  };

  const handleSwap = async () => {
    const a = amount()!;
    const as = intoAmount();

    const agreed = confirm(
      `Are you sure you want to transfer ${a.toString()} ${from()} into ${as.toString()} ${into()}? This action can't be reversed.`
    );

    if (!agreed) return;

    setDisabled(true);
    const { qty } = await swapRewards(
      pairToStr({ from: from(), into: into() }),
      a.unwrapOk()
    );
    setDisabled(false);

    alert(
      `Successfully swapped ${a.toString()} ${from()} into ${qty.toString()} ${into()}!`
    );
  };

  return (
    <div class="flex flex-col gap-5">
      <FromInput
        balance={balance()}
        amount={amount().unwrap()}
        kind={from()}
        onAmountChange={setAmount}
        onKindChange={(r) => setFrom(r.unwrapOk())}
      />
      <div class="flex flex-col justify-end gap-2">
        <Switch>
          <Match when={mode() === "transfer"}>
            <Title class="p-2" text="Transfer to Principal ID" />
            <div class="flex justify-between gap-5">
              <TextInput
                onChange={setTransferRecipient}
                value={transferRecipient().unwrap()}
                validations={[{ principal: null }]}
              />
              <E8sWidget minValue={amountToTransfer()} kind={from()} />
            </div>
            <Btn
              text="Transfer"
              icon={EIconKind.ArrowUpRight}
              iconColor={COLORS.green}
              disabled={!canTransfer() || disabled()}
              onClick={handleTransfer}
            />
          </Match>
          <Match when={mode() === "swap"}>
            <Title class="p-2" text="Swap Into" />
            <div class="flex justify-between items-center">
              <Select
                possibleValues={[EE8sKind.FMJ, EE8sKind.ICP]}
                value={EE8sKind.FMJ}
                onChange={handleSelectInto}
              />
              <E8sWidget minValue={intoAmount()} kind={into()} />
            </div>
            <div class="flex justify-between items-center">
              <ExchangeRate
                pair={pairToStr({ from: from(), into: into() })}
                editable={profProof()?.is_team_member}
              />
            </div>
            <Btn
              icon={EIconKind.ArrowsCircle}
              text="Swap"
              iconColor={COLORS.darkBlue}
              disabled={!canSwap() || disabled()}
              onClick={handleSwap}
            />
            <PriceChart pair={pairToStr({ from: from(), into: into() })} />
          </Match>
        </Switch>
      </div>
    </div>
  );
}
