import { Tabs } from "expo-router/js-tabs";
import { colors } from "@/components/ui";
import { BellButton } from "@/components/shared";
import { tabIcon } from "@/components/tabIcon";

export default function TechnicianTabs() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.brand, headerRight: () => <BellButton href="/technician/notifications" /> }}>
      <Tabs.Screen name="index" options={{ title: "My jobs", tabBarIcon: tabIcon("construct-outline") }} />
      <Tabs.Screen name="account" options={{ title: "Account", tabBarIcon: tabIcon("person-circle-outline") }} />
    </Tabs>
  );
}
