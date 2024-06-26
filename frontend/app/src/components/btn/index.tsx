import { eventHandler } from "../../utils/security";

export interface IBtnProps {
  text?: string;
  disabled?: boolean;
  onClick?: () => void;
}

export function Btn(props: IBtnProps) {
  const handleClick = eventHandler(() => props.onClick?.());

  return (
    <button disabled={props.disabled} onClick={handleClick}>
      {props.text}
    </button>
  );
}
