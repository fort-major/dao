import { SolidMarkdown } from "solid-markdown";
import remarkGfm from "remark-gfm";

export interface IMdProps {
  content: string;
  class?: string;
}

export function MdPreview(props: IMdProps) {
  const transformImageUri: (
    src: string,
    alt: string,
    title?: string
  ) => string = (src) => {
    if (
      src.endsWith(".png") ||
      src.endsWith(".jpg") ||
      src.endsWith(".svg") ||
      src.endsWith(".bmp") ||
      src.endsWith(".jpeg") ||
      src.endsWith(".webp")
    ) {
      return src;
    } else {
      return "BAD URI";
    }
  };

  return (
    <SolidMarkdown
      transformImageUri={transformImageUri}
      class={`md-content ${props.class ? props.class : ""}`.trim()}
      children={props.content}
      remarkPlugins={[remarkGfm]}
    />
  );
}
