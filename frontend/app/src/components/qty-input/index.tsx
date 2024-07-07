import { ValidationError } from "@components/validation-error";
import { E8s } from "@utils/math";
import { eventHandler } from "@utils/security";
import { Result } from "@utils/types";
import { createSignal, onMount, Setter, Show } from "solid-js";

export type TQtyInputValidation<T> =
  | { required: null }
  | { min: T }
  | { max: T };

export interface IQtyInputProps<T extends E8s | number | undefined> {
  value: T;
  onChange: (v: Result<T, T>) => void;
  symbol: string;
  mode?: "e8s" | "num";
  validations?: TQtyInputValidation<T>[];
  disabled?: boolean;
}

export function QtyInput<T extends E8s | number>(props: IQtyInputProps<T>) {
  const [error, setError] = createSignal<string | undefined>();

  const mode = () => (props.mode === "num" ? "num" : "e8s");

  const handleChange = eventHandler(
    (e: Event & { target: HTMLInputElement }) => {
      processChange(e.target.value);
    }
  );

  const processChange = (v: string | undefined) => {
    if (v === "") {
      v = undefined;
    }

    try {
      const ve =
        v === undefined
          ? undefined
          : mode() === "e8s"
          ? E8s.fromString(v)
          : parseInt(v);
      const er = isValid(mode(), ve, props.validations);

      setError(er);

      props.onChange(er ? Result.Err<T, T>(ve as T) : Result.Ok<T, T>(ve as T));
    } catch (_) {
      setError("Invalid number");
      props.onChange(Result.Err<T, T>(undefined as unknown as T));
    }
  };

  return (
    <div class="flex flex-col gap-1 min-w-52">
      <div
        class="flex items-center justify-between p-2 gap-1 shadow-sm"
        classList={{ "shadow-errorRed": !!error() }}
      >
        <input
          class="font-primary italic text-md font-medium leading-6 text-black focus:outline-none flex-grow"
          classList={{ "bg-gray-190": props.disabled }}
          placeholder="Amount..."
          type="text"
          value={props.value === undefined ? "" : props.value.toString()}
          onChange={handleChange}
          disabled={props.disabled}
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
  mode: "e8s" | "num",
  v?: E8s | number,
  validations?: TQtyInputValidation<E8s | number>[]
): string | undefined {
  if (!validations || validations.length == 0) return undefined;

  for (let validation of validations) {
    if ("required" in validation) {
      if (v === undefined) return "The field is required";
    }

    if ("min" in validation) {
      if (mode === "e8s") {
        if ((v as E8s).lt(validation.min as E8s))
          return `Min is ${validation.min.toString()}`;
      } else {
        if (v! < validation.min) return `Min is ${validation.min.toString()}`;
      }
    }

    if ("max" in validation) {
      if (mode === "e8s") {
        if ((v as E8s).gt(validation.max as E8s))
          return `Max is ${validation.max.toString()}`;
      } else {
        if (v! > validation.max) return `Max is ${validation.max.toString()}`;
      }
    }
  }

  return undefined;
}
