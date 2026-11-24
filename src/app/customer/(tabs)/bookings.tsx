import React, { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api, qs } from "@/lib/api";
import { addressText, dateTime, label, money } from "@/lib/format";
import type { BookingSummary, ServiceRequestSummary } from "@/lib/types";
import { Body, Card, Chip, colors, Empty, ErrorBox, H2, Loading, Row, Screen, StatusBadge } from "@/components/ui";

const FILTERS = [
  ["all", "All"],
  ["active", "Active"],
  ["upcoming", "Upcoming"],
  ["completed", "Completed"],
  ["cancelled", "Cancelled"],
] as const;

export default function Bookings() {
  const [status, setStatus] = useState<string>("all");
  const bookings = useQuery({
    queryKey: ["customer-bookings", status],
    queryFn: () =>
      api.get<{ bookings: BookingSummary[]; counts?: Record<string, number> | { _id: string; count: number }[] }>(
        `/api/customer/bookings${qs({ status, limit: 30 })}`,
      ),
    refetchInterval: 15_000,
  });
  const requests = useQuery({
    queryKey: ["customer-requests"],
    queryFn: () => api.get<{ requests: ServiceRequestSummary[] }>("/api/customer/service-requests?limit=20"),
    refetchInterval: 15_000,
  });
  // Requests stay here until the provider accepts (then they become bookings) or declines.
  const waiting = (requests.data?.requests || []).filter((r) => r.status === "open");
  const closed = (requests.data?.requests || []).filter((r) => ["declined", "expired"].includes(r.status));

  const refresh = () => {
    bookings.refetch();
    requests.refetch();
  };

  return (
    <Screen refreshing={bookings.isRefetching} onRefresh={refresh}>
      {waiting.length ? <H2>Waiting for provider</H2> : null}
      {waiting.map((r) => (
        <Card key={r._id}>
          <Row style={{ justifyContent: "space-between" }}>
            <Text style={{ fontWeight: "600", color: colors.text, flex: 1 }}>{r.serviceName}</Text>
            <StatusBadge status="pending" text="Awaiting confirmation" />
          </Row>
          <Body muted>{r.serviceProviderId?.companyName}</Body>
          <Body muted>{r.preferredDate ? dateTime(r.preferredDate) : "Flexible time"} · {money(r.pricing?.finalPrice)}</Body>
        </Card>
      ))}
      {closed.slice(0, 3).map((r) => (
        <Card key={r._id}>
          <Row style={{ justifyContent: "space-between" }}>
            <Text style={{ fontWeight: "600", color: colors.text, flex: 1 }}>{r.serviceName}</Text>
            <StatusBadge status="declined" text={label(r.status)} />
          </Row>
          <Body muted>{r.serviceProviderId?.companyName} couldn't take this request. Try another provider.</Body>
        </Card>
      ))}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
        {FILTERS.map(([key, text]) => (
          <Chip key={key} text={text} active={status === key} onPress={() => setStatus(key)} />
        ))}
      </ScrollView>

      {bookings.isLoading ? <Loading /> : null}
      <ErrorBox error={bookings.error} onRetry={bookings.refetch} />
      {bookings.data && bookings.data.bookings.length === 0 && !waiting.length ? (
        <Empty title="No bookings yet" text="Book a service from the Services tab." />
      ) : null}

      {bookings.data?.bookings.map((b) => (
        <Card key={b._id} onPress={() => router.push(`/customer/booking/${b._id}`)}>
          <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "600", fontSize: 15, color: colors.text }}>{b.serviceOffering?.name || b.serviceType}</Text>
              <Body muted>{b.provider?.companyName}</Body>
            </View>
            <StatusBadge status={b.job?.status || b.status} />
          </Row>
          <Body muted>{dateTime(b.job?.scheduledAt || b.scheduledAt)}</Body>
          {b.address ? <Body muted numberOfLines={1}>{addressText(b.address)}</Body> : null}
        </Card>
      ))}
    </Screen>
  );
}
