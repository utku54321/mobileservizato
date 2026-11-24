import { Redirect } from "expo-router";
import { useAuth } from "@/lib/auth";
import { roleAllowed } from "@/lib/config";

/** Entry point: send each person to the right place for their account. */
export default function Index() {
  const { status, user } = useAuth();
  if (status !== "signedIn" || !user) return <Redirect href="/sign-in" />;
  if (user.mustChangePassword) return <Redirect href="/change-password" />;
  if (!roleAllowed(user.role)) return <Redirect href="/wrong-app" />;
  switch (user.role) {
    case "customer":
      return <Redirect href="/customer" />;
    case "technician":
      return <Redirect href="/technician" />;
    case "service_provider":
      return <Redirect href="/provider" />;
    default:
      return <Redirect href="/staff" />;
  }
}
