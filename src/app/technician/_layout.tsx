import { Stack } from "expo-router";
import { colors } from "@/components/ui";

export default function TechnicianLayout() {
  return (
    <Stack screenOptions={{ headerTintColor: colors.brand, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="job/[id]" options={{ title: "Job" }} />
      <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
    </Stack>
  );
}
