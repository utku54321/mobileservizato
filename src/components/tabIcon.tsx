import React from "react";
import type { ColorValue } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

/** Tab bar icon factory for Tabs.Screen options. */
export const tabIcon =
  (name: IconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} color={color as string} size={size} />
  );
