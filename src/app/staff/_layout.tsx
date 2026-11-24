import { Stack } from "expo-router";
import { colors } from "@/components/ui";

export default function StaffLayout() {
  return (
    <Stack screenOptions={{ headerTintColor: colors.brand, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="new-lead" options={{ title: "New lead" }} />
      <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
    </Stack>
  );
}
