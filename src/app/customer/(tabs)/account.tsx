import React from "react";
import { router } from "expo-router";
import { AccountScreen } from "@/components/shared";
import { Button } from "@/components/ui";

export default function CustomerAccount() {
  return (
    <AccountScreen notificationsHref="/customer/notifications">
      <Button title="Profile & saved addresses" variant="secondary" onPress={() => router.push("/customer/profile")} />
    </AccountScreen>
  );
}
