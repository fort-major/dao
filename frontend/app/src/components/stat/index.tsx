export interface IStatProps {
  data: string;
  title: string;
  class?: string;
}

export function Stat(props: IStatProps) {
  return (
    <div class="flex flex-col min-w-64">
      <p class="font-primary font-bold italic text-8xl leading-none text-black">
        {props.data}
      </p>
      <h2 class="font-primary font-bold italic text-2xl leading-none text-right text-gray-150">
        {props.title}
      </h2>
    </div>
  );
}
