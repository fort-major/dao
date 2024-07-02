import { BooleanInput } from "@components/boolean-input";
import { EIconKind, Icon } from "@components/icon";
import { COLORS } from "@utils/colors";

export interface IMdTools {
  onH1?: () => void;
  onH2?: () => void;
  onH3?: () => void;
  onH4?: () => void;
  onH5?: () => void;
  onH6?: () => void;
  onBold?: () => void;
  onItalic?: () => void;
  onUnderline?: () => void;
  onLink?: () => void;
  onImage?: () => void;
  onPreview?: (isPreview: boolean) => void;
}

export function MdTools(props: IMdTools) {
  return (
    <div class="flex justify-between items-center px-3">
      <div class="flex gap-2 items-center">
        <Icon
          kind={EIconKind.H1}
          onClick={props.onH1}
          color={COLORS.gray[150]}
          hoverColor={COLORS.black}
          class="cursor-pointer"
        />
        <Icon
          kind={EIconKind.H2}
          onClick={props.onH2}
          color={COLORS.gray[150]}
          hoverColor={COLORS.black}
          class="cursor-pointer"
        />
        <Icon
          kind={EIconKind.H3}
          onClick={props.onH3}
          color={COLORS.gray[150]}
          hoverColor={COLORS.black}
          class="cursor-pointer"
        />
        <Icon
          kind={EIconKind.H4}
          onClick={props.onH4}
          color={COLORS.gray[150]}
          hoverColor={COLORS.black}
          class="cursor-pointer"
        />
        <Icon
          kind={EIconKind.H5}
          onClick={props.onH5}
          color={COLORS.gray[150]}
          hoverColor={COLORS.black}
          class="cursor-pointer"
        />
        <Icon
          kind={EIconKind.H6}
          onClick={props.onH6}
          color={COLORS.gray[150]}
          hoverColor={COLORS.black}
          class="cursor-pointer"
        />
        <div class="flex items-center gap-0">
          <Icon
            kind={EIconKind.Bold}
            onClick={props.onBold}
            color={COLORS.gray[150]}
            hoverColor={COLORS.black}
            class="cursor-pointer"
          />
          <Icon
            kind={EIconKind.Italic}
            onClick={props.onItalic}
            color={COLORS.gray[150]}
            hoverColor={COLORS.black}
            class="cursor-pointer"
          />
          <Icon
            kind={EIconKind.Underline}
            onClick={props.onUnderline}
            color={COLORS.gray[150]}
            hoverColor={COLORS.black}
            class="cursor-pointer"
          />
        </div>
        <Icon
          kind={EIconKind.Link}
          onClick={props.onLink}
          color={COLORS.gray[150]}
          hoverColor={COLORS.black}
          class="cursor-pointer"
        />
        <Icon
          kind={EIconKind.Image}
          onClick={props.onImage}
          color={COLORS.gray[150]}
          hoverColor={COLORS.black}
          class="cursor-pointer"
        />
      </div>
      <BooleanInput onChange={props.onPreview} labels={["Preview", "Edit"]} />
    </div>
  );
}
