import { SolidMarkdown } from "solid-markdown";
import remarkGfm from "remark-gfm";

export interface IMdProps {
  content: string;
  class?: string;
}

export function MdPreview(props: IMdProps) {
  return (
    <SolidMarkdown
      class={`md-content ${props.class ? props.class : ""}`.trim()}
      children={props.content}
      remarkPlugins={[remarkGfm]}
    />
  );
}
