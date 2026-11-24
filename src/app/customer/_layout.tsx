import { Stack } from "expo-router";
import { colors } from "@/components/ui";

export default function CustomerLayout() {
  return (
    <Stack screenOptions={{ headerTintColor: colors.brand, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="book" options={{ title: "Book service" }} />
      <Stack.Screen name="booking/[id]" options={{ title: "Booking" }} />
      <Stack.Screen name="invoice/[id]" options={{ title: "Invoice" }} />
      <Stack.Screen name="profile" options={{ title: "Profile & addresses" }} />
      <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
    </Stack>
  );
}
