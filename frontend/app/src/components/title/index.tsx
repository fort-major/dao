export interface ITitleProps {
  text: string;
}

export function Title(props: ITitleProps) {
  return <p class="font-primary text-xs font-bold text-black">{props.text}</p>;
}
