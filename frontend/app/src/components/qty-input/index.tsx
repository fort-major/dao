import { ValidationError } from "@components/validation-error";
import { E8s } from "@utils/math";
import { eventHandler } from "@utils/security";
import { createSignal, Show } from "solid-js";

export type TQtyInputValidation = { min: E8s } | { max: E8s };

export interface IQtyInputProps {
  symbol: string;
  defaultValue?: E8s;
  validations?: TQtyInputValidation[];
  onChange?: (v: E8s | undefined) => void;
}

export function QtyInput(props: IQtyInputProps) {
  const [value, setValue] = createSignal(props.defaultValue);
  const [error, setError] = createSignal<string | undefined>();

  const handleChange = eventHandler(
    (e: Event & { target: HTMLInputElement }) => {
      const v = e.target.value;

      if (v === "") {
        setValue(undefined);
        props.onChange?.(undefined);
        return;
      }

      try {
        const ve = E8s.fromString(v);
        const er = isValid(ve, props.validations);

        if (er) {
          setError(er);
          props.onChange?.(undefined);
          return;
        }

        setError(undefined);
        setValue(ve);
        props.onChange?.(ve);
      } catch (_) {
        setError("Invalid number");
        props.onChange?.(undefined);
      }
    }
  );

  return (
    <div class="flex flex-col gap-1 min-w-52">
      <div
        class="flex items-center justify-between p-2 gap-1 shadow-sm"
        classList={{ "shadow-errorRed": !!error() }}
      >
        <input
          class="font-primary italic text-md font-medium leading-6 text-black focus:outline-none flex-grow"
          placeholder="Amount..."
          type="text"
          value={value() ? value()!.toString() : ""}
          onChange={handleChange}
        />
        <p class="font-primary text-md font-normal leading-6 text-gray-150">
          {props.symbol}
        </p>
      </div>
      <ValidationError error={error()} />
    </div>
  );
}

function isValid(
  v: E8s,
  validations?: TQtyInputValidation[]
): string | undefined {
  if (!validations || validations.length == 0) return undefined;

  for (let validation of validations) {
    if ("min" in validation) {
      if (v.lt(validation.min)) return `Min is ${validation.min.toString()}`;
    }

    if ("max" in validation) {
      if (v.gt(validation.max)) return `Max is ${validation.max.toString()}`;
    }
  }

  return undefined;
}
