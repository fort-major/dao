import { FollowForm } from "@components/follow-form";
import { Page } from "@components/page";
import { ProfileFull } from "@components/profile/profile";
import { TransferSwapForm } from "@components/transfer-swap-form";
import { useAuth } from "@store/auth";

export function MePage() {
  const { identity } = useAuth();

  const me = () => identity()?.getPrincipal();

  return (
    <Page slim>
      <div class="grid grid-cols-2 gap-5">
        <ProfileFull id={me()} me />
        <TransferSwapForm class="flex-grow self-end" />
      </div>
      <FollowForm />
    </Page>
  );
}
