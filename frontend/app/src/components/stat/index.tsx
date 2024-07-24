export interface IStatProps {
  data: string;
  title: string;
  class?: string;
}

export function Stat(props: IStatProps) {
  return (
    <div
      class="flex flex-col xl:min-w-64"
      classList={{ [props.class!]: !!props.class }}
    >
      <p class="font-primary font-bold italic text-6xl xl:text-8xl leading-none text-black">
        {props.data}
      </p>
      <h2 class="font-primary font-bold italic text-2xl xl:text-2xl leading-none text-gray-150">
        {props.title}
      </h2>
    </div>
  );
}
