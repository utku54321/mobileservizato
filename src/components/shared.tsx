import React from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { API_URL, VARIANT } from "@/lib/config";
import { dateTime, label } from "@/lib/format";
import { Body, Button, Card, colors, Empty, ErrorBox, H2, KeyValue, Loading, Screen } from "./ui";

/** Approved general-contact mailbox (lib/public-business-contact.ts on the website). */
export const SUPPORT_EMAIL = "servizato.in@gmail.com";

export function openWeb(path: string) {
  return WebBrowser.openBrowserAsync(`${API_URL}${path}`);
}

interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  status: string;
  createdAt: string;
}

export function useUnreadCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notifications-unread", user?.id],
    queryFn: () => api.get<{ unreadCount: number }>("/api/notifications?limit=1&unreadOnly=true"),
    refetchInterval: 30_000,
    select: (d) => d.unreadCount,
    enabled: Boolean(user?.id),
  });
}

/** Bell icon for headers; shows the unread count from the website's notification feed. */
export function BellButton({ href }: { href: string }) {
  const unread = useUnreadCount();
  return (
    <Pressable onPress={() => router.push(href as never)} hitSlop={12} style={{ paddingHorizontal: 8 }}>
      <Ionicons name="notifications-outline" size={22} color={colors.text} />
      {unread.data ? (
        <View style={{ position: "absolute", right: 2, top: -4, backgroundColor: colors.danger, borderRadius: 8, minWidth: 16, paddingHorizontal: 3 }}>
          <Text style={{ color: "#fff", fontSize: 10, textAlign: "center", fontWeight: "700" }}>
            {unread.data > 99 ? "99+" : unread.data}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function NotificationsScreen() {
  const { user } = useAuth();
  const client = useQueryClient();
  const q = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () =>
      api.get<{ notifications: NotificationItem[]; unreadCount: number }>("/api/notifications?limit=50"),
    refetchInterval: 30_000,
  });
  const markAll = useMutation({
    mutationFn: () => api.post("/api/notifications/mark-all-read"),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["notifications"] });
      client.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });
  const markOne = useMutation({
    mutationFn: (id: string) => api.put(`/api/notifications/${id}`, { status: "read" }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["notifications"] });
      client.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      {q.isLoading ? <Loading /> : null}
      <ErrorBox error={q.error} onRetry={q.refetch} />
      {q.data?.unreadCount ? (
        <Button title="Mark all as read" variant="secondary" loading={markAll.isPending} onPress={() => markAll.mutate()} />
      ) : null}
      {q.data && q.data.notifications.length === 0 ? <Empty title="No notifications yet" /> : null}
      {q.data?.notifications.map((n) => (
        <Card key={n._id} onPress={n.status === "unread" ? () => markOne.mutate(n._id) : undefined}
          style={n.status === "unread" ? { borderColor: colors.brand } : undefined}>
          <Text style={{ fontWeight: n.status === "unread" ? "700" : "500", color: colors.text }}>{n.title}</Text>
          <Body>{n.message}</Body>
          <Body muted>{dateTime(n.createdAt)}</Body>
        </Card>
      ))}
    </Screen>
  );
}

/** Account tab shared by every app. Extra rows (e.g. "Manage services on web") come in via children. */
export function AccountScreen({ children, notificationsHref }: { children?: React.ReactNode; notificationsHref: string }) {
  const { user, signOut } = useAuth();
  return (
    <Screen>
      <Card>
        <H2>{user?.name || "Your account"}</H2>
        <KeyValue k="Email" v={user?.email?.endsWith("@service.local") ? "—" : user?.email} />
        <KeyValue k="Phone" v={user?.phone} />
        <KeyValue k="Account type" v={label(user?.role)} />
      </Card>
      <Button title="Notifications" variant="secondary" onPress={() => router.push(notificationsHref as never)} />
      {children}
      <Button title="Help & contact" variant="secondary" onPress={() => openWeb("/contact")} />
      <Button title="Privacy policy" variant="ghost" onPress={() => openWeb("/privacy")} />
      <Button title="Terms" variant="ghost" onPress={() => openWeb("/terms")} />
      {VARIANT !== "ops" ? (
        <Button
          title="Request account deletion"
          variant="ghost"
          onPress={() =>
            Linking.openURL(
              `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Delete my Servizato account")}&body=${encodeURIComponent(
                `Please delete my Servizato account and associated data.\n\nAccount email: ${user?.email || ""}\nPhone: ${user?.phone || ""}`,
              )}`,
            )
          }
        />
      ) : null}
      <Button title="Sign out" variant="danger" onPress={signOut} />
    </Screen>
  );
}
