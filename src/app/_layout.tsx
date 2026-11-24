import React from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/lib/auth";
import { roleAllowed } from "@/lib/config";
import { ApiError } from "@/lib/api";
import { colors, Loading } from "@/components/ui";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: (count, error) => {
        const status = (error as ApiError)?.status;
        return ![400, 401, 403, 404].includes(status) && count < 2;
      },
    },
  },
});

function RootNavigator() {
  const { status, user } = useAuth();
  if (status === "loading") {
    return (
      <View style={{ flex: 1, justifyContent: "center", backgroundColor: colors.bg }}>
        <Loading />
      </View>
    );
  }
  const signedIn = status === "signedIn" && Boolean(user);
  const mustChange = signedIn && Boolean(user?.mustChangePassword);
  const allowed = signedIn && !mustChange && roleAllowed(user?.role);
  const role = user?.role;

  return (
    <Stack screenOptions={{ headerTintColor: colors.brand, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />

      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        <Stack.Screen name="sign-up" options={{ title: "Create account" }} />
      </Stack.Protected>

      <Stack.Protected guard={mustChange}>
        <Stack.Screen name="change-password" options={{ title: "Set a new password" }} />
      </Stack.Protected>

      <Stack.Protected guard={signedIn && !mustChange && !allowed}>
        <Stack.Screen name="wrong-app" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={allowed}>
        <Stack.Protected guard={role === "customer"}>
          <Stack.Screen name="customer" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={role === "technician"}>
          <Stack.Screen name="technician" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={role === "service_provider"}>
          <Stack.Screen name="provider" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={role === "admin" || role === "dispatcher"}>
          <Stack.Screen name="staff" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
