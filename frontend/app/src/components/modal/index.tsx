import { EIconKind, Icon } from "@components/icon";
import { COLORS } from "@utils/colors";
import { IChildren } from "@utils/types";
import { createEffect, createSignal, onCleanup, onMount } from "solid-js";
import { Portal, Show } from "solid-js/web";

export interface IModalProps extends IChildren {
  title?: string;
  onClose?: () => void;
}

export function Modal(props: IModalProps) {
  const handleClose = () => {
    props?.onClose?.();
  };

  let ref: HTMLDivElement | undefined = undefined;
  const mount = document.getElementById("portal")!;

  onMount(() => {
    ref!.className = "relative";
    mount.onclick = handleClose;
    mount.style.display = "block";
  });

  onCleanup(() => {
    mount.style.display = "none";
  });

  return (
    <Portal ref={ref} mount={mount}>
      <div class="flex flex-col gap-4 p-2 shadow-lg min-w-80 min-h-80">
        <div class="flex items-center justify-between">
          <p class="font-primary font-bold text-2xl">
            {props.title ?? "Dialog"}
          </p>
          <Icon
            kind={EIconKind.CancelCircle}
            color={COLORS.gray[150]}
            onClick={handleClose}
            class="cursor-pointer"
          />
        </div>
        {props.children}
      </div>
    </Portal>
  );
}
