import { Btn } from "@components/btn";
import { E8sWidget, EE8sKind } from "@components/e8s-widget";
import { FromInput } from "@components/from-input";
import { EIconKind } from "@components/icon";
import { TextInput } from "@components/text-input";
import { Title } from "@components/title";
import { Principal } from "@dfinity/principal";
import { useAuth } from "@store/auth";
import { useBank } from "@store/bank";
import { COLORS } from "@utils/colors";
import { err, ErrorCode } from "@utils/error";
import { E8s } from "@utils/math";
import { createSignal, Match, Switch } from "solid-js";

export interface ITransferSwapFormProps {}

export function TransferSwapForm(props: ITransferSwapFormProps) {
  const { myBalance } = useAuth();
  const { transfer, swapRewards } = useBank();

  const [from, setFrom] = createSignal(EE8sKind.Hours);
  const [amount, setAmount] = createSignal<E8s | undefined>();
  const [transferRecipient, setTransferRecipient] = createSignal<
    Principal | undefined
  >();

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

    await transfer(from() as "ICP" | "FMJ", a, recipient);

    alert("Successful transfer");
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
            <Title text="Recipient Principal ID" />
            <div class="flex justify-between gap-5">
              <TextInput
                onChange={handleTransferRecipientChange}
                validations={[{ principal: null }]}
              />
              <E8sWidget value={amountToTransfer()} kind={from()} />
            </div>
            <Btn
              text="Transfer"
              icon={EIconKind.ArrowUpRight}
              iconColor={COLORS.green}
              disabled={!canTransfer()}
              onClick={handleTransfer}
            />
          </Match>
          <Match when={mode() === "swap"}>TODO</Match>
        </Switch>
      </div>
    </div>
  );
}
