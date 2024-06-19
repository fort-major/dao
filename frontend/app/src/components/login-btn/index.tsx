import { useAuth } from "../../store/auth";
import { eventHandler } from "../../utils/security";

export function LoginBtn() {
  const { authorize } = useAuth();

  const handleClick = eventHandler(() => {
    authorize();
  });

  return (
    <button onClick={handleClick}>
      <p>Login to proceed</p>
      <img src="/icons/mm-fox.svg" alt="MetaMask" />
    </button>
  );
}
