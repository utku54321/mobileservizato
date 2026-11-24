import React from "react";
import { AccountScreen, openWeb } from "@/components/shared";
import { Body, Button, H2 } from "@/components/ui";

/** Business setup screens are on the website for now; the app covers daily operations. */
export default function ProviderAccount() {
  return (
    <AccountScreen notificationsHref="/provider/notifications">
      <H2>Business setup (opens website)</H2>
      <Body muted>Sign in on the website once with the same account to manage these.</Body>
      <Button title="Onboarding & verification" variant="secondary" onPress={() => openWeb("/service-provider/onboarding")} />
      <Button title="Services & pricing" variant="secondary" onPress={() => openWeb("/service-provider/services")} />
      <Button title="Service areas" variant="secondary" onPress={() => openWeb("/service-provider/provider-services-area")} />
      <Button title="Finance, payouts & invoices" variant="secondary" onPress={() => openWeb("/service-provider/finance")} />
      <Button title="Business profile" variant="secondary" onPress={() => openWeb("/service-provider/profile")} />
    </AccountScreen>
  );
}
