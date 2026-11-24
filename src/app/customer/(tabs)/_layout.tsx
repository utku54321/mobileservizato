import { Tabs } from "expo-router/js-tabs";
import { colors } from "@/components/ui";
import { BellButton } from "@/components/shared";
import { tabIcon } from "@/components/tabIcon";

const icon = tabIcon;

export default function CustomerTabs() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.brand,
        headerRight: () => <BellButton href="/customer/notifications" />,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Services", tabBarIcon: icon("search") }} />
      <Tabs.Screen name="bookings" options={{ title: "Bookings", tabBarIcon: icon("calendar-outline") }} />
      <Tabs.Screen name="invoices" options={{ title: "Bills", tabBarIcon: icon("receipt-outline") }} />
      <Tabs.Screen name="account" options={{ title: "Account", tabBarIcon: icon("person-circle-outline") }} />
    </Tabs>
  );
}
