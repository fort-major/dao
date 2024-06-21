import { SolidMarkdown } from "solid-markdown";
import remarkGfm from "remark-gfm";

export interface IMdProps {
  content: string;
  allowHeadings?: boolean;
}

export function Md(props: IMdProps) {
  const disallowedElements = [];

  if (!props.allowHeadings) {
    disallowedElements.push("#");
    disallowedElements.push("##");
    disallowedElements.push("###");
    disallowedElements.push("####");
    disallowedElements.push("#####");
    disallowedElements.push("######");
  }

  return (
    <SolidMarkdown
      class="md-content"
      disallowedElements={disallowedElements}
      children={props.content}
      remarkPlugins={[remarkGfm]}
    />
  );
}
