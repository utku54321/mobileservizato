import React from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import { BRAND } from "@/lib/config";
import { label, statusTone } from "@/lib/format";
import { errorText } from "@/lib/api";

export const colors = {
  brand: BRAND,
  text: "#0F172A",
  muted: "#64748B",
  border: "#E2E8F0",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  danger: "#DC2626",
  success: "#16A34A",
  warning: "#D97706",
  info: "#2563EB",
};

export function Screen({
  children,
  refreshing,
  onRefresh,
  padded = true,
}: {
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  padded?: boolean;
}) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={padded ? { padding: 16, paddingBottom: 40, gap: 12 } : undefined}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} /> : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

export function Card({
  children,
  onPress,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const body = <View style={[styles.card, style]}>{children}</View>;
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      {body}
    </Pressable>
  );
}

export function H1({ children }: { children: React.ReactNode }) {
  return <Text style={styles.h1}>{children}</Text>;
}
export function H2({ children }: { children: React.ReactNode }) {
  return <Text style={styles.h2}>{children}</Text>;
}
export function Body({
  children,
  muted,
  style,
  numberOfLines,
}: {
  children: React.ReactNode;
  muted?: boolean;
  style?: object;
  numberOfLines?: number;
}) {
  return (
    <Text numberOfLines={numberOfLines} style={[styles.body, muted && { color: colors.muted }, style]}>
      {children}
    </Text>
  );
}

export function Row({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: "row", alignItems: "center", gap: 8 }, style]}>{children}</View>;
}

export function KeyValue({ k, v }: { k: string; v?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 3 }}>
      <Text style={{ color: colors.muted, fontSize: 14 }}>{k}</Text>
      <Text style={{ color: colors.text, fontSize: 14, fontWeight: "500", flexShrink: 1, textAlign: "right" }}>
        {v ?? "—"}
      </Text>
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const off = disabled || loading;
  const bg =
    variant === "primary" ? colors.brand : variant === "danger" ? colors.danger : variant === "secondary" ? "#fff" : "transparent";
  const fg = variant === "primary" || variant === "danger" ? "#fff" : variant === "ghost" ? colors.brand : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={off ? undefined : onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: off ? 0.5 : pressed ? 0.8 : 1 },
        variant === "secondary" && { borderWidth: 1, borderColor: colors.border },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={{ color: fg, fontWeight: "600", fontSize: 15 }}>{title}</Text>}
    </Pressable>
  );
}

export function Field({ label: text, error, ...props }: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ fontSize: 13, fontWeight: "600", color: colors.text }}>{text}</Text>
      <TextInput
        placeholderTextColor="#94A3B8"
        {...props}
        style={[styles.input, props.multiline && { minHeight: 80, textAlignVertical: "top" }, error && { borderColor: colors.danger }]}
      />
      {error ? <Text style={{ color: colors.danger, fontSize: 12 }}>{error}</Text> : null}
    </View>
  );
}

export function Chip({ text, active, onPress }: { text: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? colors.brand : colors.border,
        backgroundColor: active ? colors.brand : "#fff",
      }}
    >
      <Text style={{ color: active ? "#fff" : colors.text, fontSize: 13, fontWeight: "500" }}>{text}</Text>
    </Pressable>
  );
}

const toneColors = {
  neutral: ["#F1F5F9", "#334155"],
  info: ["#DBEAFE", "#1D4ED8"],
  success: ["#DCFCE7", "#15803D"],
  warning: ["#FEF3C7", "#B45309"],
  danger: ["#FEE2E2", "#B91C1C"],
} as const;

export function StatusBadge({ status, text }: { status?: string | null; text?: string }) {
  const [bg, fg] = toneColors[statusTone(status)];
  return (
    <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, alignSelf: "flex-start" }}>
      <Text style={{ color: fg, fontSize: 12, fontWeight: "600" }}>{text || label(status)}</Text>
    </View>
  );
}

export function Loading({ text }: { text?: string }) {
  return (
    <View style={{ padding: 40, alignItems: "center", gap: 10 }}>
      <ActivityIndicator color={colors.brand} />
      {text ? <Body muted>{text}</Body> : null}
    </View>
  );
}

export function ErrorBox({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  if (!error) return null;
  return (
    <View style={[styles.card, { borderColor: "#FECACA", backgroundColor: "#FEF2F2", gap: 8 }]}>
      <Text style={{ color: colors.danger, fontWeight: "500" }}>{errorText(error)}</Text>
      {onRetry ? <Button title="Try again" variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

export function Notice({ text, tone = "info" }: { text: string; tone?: keyof typeof toneColors }) {
  const [bg, fg] = toneColors[tone];
  return (
    <View style={{ backgroundColor: bg, borderRadius: 12, padding: 12 }}>
      <Text style={{ color: fg, fontSize: 14 }}>{text}</Text>
    </View>
  );
}

export function Empty({ title, text }: { title: string; text?: string }) {
  return (
    <View style={{ padding: 32, alignItems: "center", gap: 6 }}>
      <Text style={{ fontSize: 16, fontWeight: "600", color: colors.text }}>{title}</Text>
      {text ? <Body muted style={{ textAlign: "center" }}>{text}</Body> : null}
    </View>
  );
}

export function Stat({ title, value }: { title: string; value: React.ReactNode }) {
  return (
    <View style={[styles.card, { flexGrow: 1, flexBasis: "45%", gap: 4 }]}>
      <Text style={{ color: colors.muted, fontSize: 12 }}>{title}</Text>
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: "700" }}>{value}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 6,
  },
  h1: { fontSize: 24, fontWeight: "700", color: colors.text },
  h2: { fontSize: 17, fontWeight: "600", color: colors.text },
  body: { fontSize: 14, color: colors.text, lineHeight: 20 },
  button: {
    minHeight: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: "#fff",
  },
});
