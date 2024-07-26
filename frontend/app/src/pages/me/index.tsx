import { FollowForm } from "@components/follow-form";
import { Page } from "@components/page";
import { ProfileFull } from "@components/profile/profile";
import { TransferSwapForm } from "@components/transfer-swap-form";
import { useAuth } from "@store/auth";

export function MePage() {
  const { identity } = useAuth();

  const me = () => identity()?.getPrincipal();

  return (
    <Page slim class="pt-10 pb-20">
      <div class="grid self-stretch grid-cols-1 md:grid-cols-2 gap-10 md:gap-5">
        <ProfileFull id={me()} me />
        <TransferSwapForm class="flex-grow self-end" />
      </div>
      <FollowForm />
    </Page>
  );
}
