import { Tabs } from "expo-router/js-tabs";
import { colors } from "@/components/ui";
import { BellButton } from "@/components/shared";
import { tabIcon } from "@/components/tabIcon";

export default function ProviderTabs() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.brand, headerRight: () => <BellButton href="/provider/notifications" /> }}>
      <Tabs.Screen name="index" options={{ title: "Dashboard", tabBarIcon: tabIcon("grid-outline") }} />
      <Tabs.Screen name="requests" options={{ title: "Requests", tabBarIcon: tabIcon("mail-unread-outline") }} />
      <Tabs.Screen name="bookings" options={{ title: "Bookings", tabBarIcon: tabIcon("calendar-outline") }} />
      <Tabs.Screen name="team" options={{ title: "Pros", tabBarIcon: tabIcon("people-outline") }} />
      <Tabs.Screen name="account" options={{ title: "Account", tabBarIcon: tabIcon("person-circle-outline") }} />
    </Tabs>
  );
}
