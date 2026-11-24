import React, { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api, qs } from "@/lib/api";
import { dateTime, money } from "@/lib/format";
import type { Address } from "@/lib/types";
import { Body, Card, Chip, colors, Empty, ErrorBox, Loading, Row, Screen, StatusBadge } from "@/components/ui";

interface ProviderBooking {
  _id: string;
  serviceType: string;
  status: string;
  scheduledAt?: string;
  address?: Address;
  pricing?: { finalPrice?: number };
  customerId?: { name?: string; phone?: string };
  serviceOfferingId?: { name?: string };
  technicianId?: { _id: string } | null;
}

const FILTERS = ["all", "confirmed", "assigned", "pending", "cancelled"];

export default function ProviderBookings() {
  const [status, setStatus] = useState("all");
  const q = useQuery({
    queryKey: ["provider-bookings", status],
    queryFn: () => api.get<{ bookings: ProviderBooking[] }>(`/api/service-provider/bookings${qs({ status })}`),
    refetchInterval: 20_000,
  });
  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {FILTERS.map((f) => (
          <Chip key={f} text={f === "all" ? "All" : f[0].toUpperCase() + f.slice(1)} active={status === f} onPress={() => setStatus(f)} />
        ))}
      </ScrollView>
      {q.isLoading ? <Loading /> : null}
      <ErrorBox error={q.error} onRetry={q.refetch} />
      {q.data && q.data.bookings.length === 0 ? <Empty title="No bookings" /> : null}
      {q.data?.bookings.map((b) => (
        <Card key={b._id} onPress={() => router.push(`/provider/booking/${b._id}`)}>
          <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "600", color: colors.text }}>{b.serviceOfferingId?.name || b.serviceType}</Text>
              <Body muted>{b.customerId?.name || "Customer"}</Body>
            </View>
            <StatusBadge status={b.status} />
          </Row>
          <Body muted>{dateTime(b.scheduledAt)} · {money(b.pricing?.finalPrice)}</Body>
          {b.status === "confirmed" && !b.technicianId ? <Body style={{ color: colors.warning }}>Needs a Pro</Body> : null}
        </Card>
      ))}
    </Screen>
  );
}
