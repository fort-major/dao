import { getReadableTextColor } from "../../utils/color";

export interface IChipProps {
  text: string;
  bgColor: string;
}

export function Chip(props: IChipProps) {
  return (
    <span
      class="p-1 rounded-md font-sans font-light text-xs text-white text-center"
      style={{
        "background-color": props.bgColor,
      }}
    >
      {props.text}
    </span>
  );
}

export function ChipSkeleton() {
  return <span class="p-1 rounded-sm w-9 bg-gray-700 animate-pulse" />;
}
