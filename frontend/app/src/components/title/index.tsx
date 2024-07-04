export interface ITitleProps {
  text: string;
  class?: string;
}

export function Title(props: ITitleProps) {
  return (
    <p
      class={`font-primary text-xs font-bold text-black ${
        props.class ? props.class : ""
      }`}
    >
      {props.text}
    </p>
  );
}
