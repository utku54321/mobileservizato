import { Tabs } from "expo-router/js-tabs";
import { useAuth } from "@/lib/auth";
import { colors } from "@/components/ui";
import { BellButton } from "@/components/shared";
import { tabIcon } from "@/components/tabIcon";

/** Admins see moderation tabs; dispatchers see operations only (the backend enforces the same). */
export default function StaffTabs() {
  const { user } = useAuth();
  const admin = user?.role === "admin";
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.brand, headerRight: () => <BellButton href="/staff/notifications" /> }}>
      <Tabs.Protected guard={admin}>
        <Tabs.Screen name="index" options={{ title: "Overview", tabBarIcon: tabIcon("speedometer-outline") }} />
        <Tabs.Screen name="approvals" options={{ title: "Approvals", tabBarIcon: tabIcon("shield-checkmark-outline") }} />
      </Tabs.Protected>
      <Tabs.Screen name="jobs" options={{ title: "Jobs", tabBarIcon: tabIcon("construct-outline") }} />
      <Tabs.Screen name="bookings" options={{ title: "Bookings", tabBarIcon: tabIcon("calendar-outline") }} />
      <Tabs.Screen name="leads" options={{ title: "Leads", tabBarIcon: tabIcon("call-outline") }} />
      <Tabs.Screen name="account" options={{ title: "Account", tabBarIcon: tabIcon("person-circle-outline") }} />
    </Tabs>
  );
}
