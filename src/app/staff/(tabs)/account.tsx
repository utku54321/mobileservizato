import React from "react";
import { useAuth } from "@/lib/auth";
import { AccountScreen, openWeb } from "@/components/shared";
import { Body, Button, H2 } from "@/components/ui";

export default function StaffAccount() {
  const { user } = useAuth();
  const admin = user?.role === "admin";
  return (
    <AccountScreen notificationsHref="/staff/notifications">
      <H2>More tools (opens website)</H2>
      <Body muted>Sign in on the website once with the same account.</Body>
      {admin ? <Button title="Finance & commissions" variant="secondary" onPress={() => openWeb("/admin/finance")} /> : null}
      {admin ? <Button title="Catalog & price master" variant="secondary" onPress={() => openWeb("/admin/pricemaster")} /> : null}
      {admin ? <Button title="Analytics" variant="secondary" onPress={() => openWeb("/admin/analytics")} /> : null}
      <Button title="Billing" variant="secondary" onPress={() => openWeb(admin ? "/admin/billing" : "/dispatcher/billing")} />
    </AccountScreen>
  );
}
