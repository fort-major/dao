import { Page } from "@components/page";
import { ProfileFull } from "@components/profile/profile";
import { TransferSwapForm } from "@components/transfer-swap-form";
import { useAuth } from "@store/auth";

export function MePage() {
  const { identity } = useAuth();

  const me = () => identity()?.getPrincipal();

  return (
    <Page class="pt-6 max-w-4xl self-center">
      <ProfileFull id={me()} me />
      <TransferSwapForm />
    </Page>
  );
}
