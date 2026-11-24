import { Stack } from "expo-router";
import { colors } from "@/components/ui";

export default function ProviderLayout() {
  return (
    <Stack screenOptions={{ headerTintColor: colors.brand, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="booking/[id]" options={{ title: "Booking" }} />
      <Stack.Screen name="add-pro" options={{ title: "Add a Pro" }} />
      <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
    </Stack>
  );
}
