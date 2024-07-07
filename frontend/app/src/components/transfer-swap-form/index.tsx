import { Btn } from "@components/btn";
import { E8sWidget, EE8sKind } from "@components/e8s-widget";
import { ExchangeRate } from "@components/exchange-rate";
import { FromInput } from "@components/from-input";
import { EIconKind } from "@components/icon";
import { Select } from "@components/select";
import { TextInput } from "@components/text-input";
import { Title } from "@components/title";
import { Principal } from "@dfinity/principal";
import { useAuth } from "@store/auth";
import { useBank } from "@store/bank";
import { COLORS } from "@utils/colors";
import { pairToStr } from "@utils/encoding";
import { err, ErrorCode } from "@utils/error";
import { E8s } from "@utils/math";
import { createSignal, from, Match, Switch } from "solid-js";

export interface ITransferSwapFormProps {}

export function TransferSwapForm(props: ITransferSwapFormProps) {
  const { myBalance, profileProof } = useAuth();
  const { transfer, swapRewards, exchangeRates } = useBank();

  const [from, setFrom] = createSignal(EE8sKind.Hours);
  const [into, setInto] = createSignal(EE8sKind.FMJ);
  const [amount, setAmount] = createSignal<E8s | undefined>();
  const [transferRecipient, setTransferRecipient] = createSignal<
    Principal | undefined
  >();
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

    if (!a) return E8s.zero();

    const fee = E8s.new(1000n);

    if (a.le(fee)) return E8s.zero();

    return a.sub(fee);
  };

  const mode = () => {
    if (from() === EE8sKind.Hours || from() === EE8sKind.Storypoints)
      return "swap";
    if (from() === EE8sKind.FMJ || from() === EE8sKind.ICP) return "transfer";

    err(ErrorCode.UNREACHEABLE, `Unexpected token ${from()}`);
  };

  const handleFromChange = (kind: EE8sKind, a: E8s | undefined) => {
    setFrom(kind);
    setAmount(a);
  };

  const canTransfer = () =>
    mode() === "transfer" && transferRecipient() && amount()?.toBool();

  const canSwap = () => mode() === "swap" && into() && intoAmount().toBool();

  const handleTransferRecipientChange = (value: string | undefined) => {
    setTransferRecipient(value ? Principal.fromText(value) : undefined);
  };

  const handleTransfer = async () => {
    const a = amount()!;
    const at = amountToTransfer()!;
    const recipient = transferRecipient()!;

    const agreed = confirm(
      `Are you sure you want to transfer ${at.toString()} total ${from()} to ${recipient.toText()}? This action can't be reversed.`
    );

    if (!agreed) return;

    setDisabled(true);
    await transfer(from() as "ICP" | "FMJ", a, recipient);
    setDisabled(false);

    alert("Successful transfer");
  };

  const handleSelectInto = (into: string) => {
    setInto(into as EE8sKind);
  };

  const exchangeRate = () => {
    const history = exchangeRates[pairToStr({ from: from(), into: into() })];

    if (!history) return E8s.zero();

    return history[history.length - 1][1];
  };

  const intoAmount = () => {
    const a = amount();

    if (!a) return E8s.zero();

    return a.mul(exchangeRate());
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
      a
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
        kind={from()}
        onChange={handleFromChange}
      />
      <div class="flex flex-col justify-end gap-2">
        <Switch>
          <Match when={mode() === "transfer"}>
            <Title class="p-2" text="Transfer to Principal ID" />
            <div class="flex justify-between gap-5">
              <TextInput
                setValue={handleTransferRecipientChange}
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
                values={[EE8sKind.FMJ, EE8sKind.ICP]}
                defaultValue={EE8sKind.FMJ}
                onChange={handleSelectInto}
              />
              <E8sWidget minValue={intoAmount()} kind={into()} />
            </div>
            <div class="flex justify-between items-center">
              <ExchangeRate
                pair={pairToStr({ from: from(), into: into() })}
                rate={exchangeRate()}
                editable={profileProof()?.is_team_member}
              />
            </div>
            <Btn
              icon={EIconKind.ArrowsCircle}
              text="Swap"
              iconColor={COLORS.darkBlue}
              disabled={!canSwap() || disabled()}
              onClick={handleSwap}
            />
          </Match>
        </Switch>
      </div>
    </div>
  );
}
