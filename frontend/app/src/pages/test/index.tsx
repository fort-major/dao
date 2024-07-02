import { For, Show, createEffect, onMount } from "solid-js";
import { Btn } from "../../components/btn";
import { EIconKind } from "../../components/icon";
import { BooleanInput } from "@components/boolean-input";
import { MdTools } from "@components/md-tools";
import { MdInput } from "@components/md-input";

export function TestPage() {
  return (
    <main class="flex flex-row justify-center">
      <section class="w-256 flex flex-col gap-4">
        <Btn text="Log In" icon={EIconKind.MetaMask} />
        <BooleanInput />
        <MdTools />
        <MdInput />
      </section>
    </main>
  );
}
