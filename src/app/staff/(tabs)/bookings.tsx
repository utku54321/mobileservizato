import React, { useState } from "react";
import { Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api, qs } from "@/lib/api";
import { addressText, dateTime, money } from "@/lib/format";
import type { Address } from "@/lib/types";
import { Body, Card, colors, Empty, ErrorBox, Field, Loading, Row, Screen, StatusBadge } from "@/components/ui";

interface StaffBooking {
  _id: string;
  serviceType: string;
  status: string;
  scheduledAt?: string;
  estimatedPrice?: number;
  pricing?: { finalPrice?: number };
  address?: Address;
  customerId?: { name?: string; phone?: string } | null;
  createdAt: string;
}

export default function StaffBookings() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const list = useQuery({
    queryKey: ["staff-bookings", search],
    queryFn: () => api.get<{ bookings: StaffBooking[]; total: number }>(`/api/bookings${qs({ page: 1, limit: 50, q: search })}`),
    refetchInterval: 30_000,
  });
  return (
    <Screen refreshing={list.isRefetching} onRefresh={list.refetch}>
      <Field label="Search" value={q} onChangeText={setQ} placeholder="Service or customer" returnKeyType="search" onSubmitEditing={() => setSearch(q.trim())} />
      {list.isLoading ? <Loading /> : null}
      <ErrorBox error={list.error} onRetry={list.refetch} />
      {list.data ? <Body muted>{list.data.total} bookings</Body> : null}
      {list.data && list.data.bookings.length === 0 ? <Empty title="No bookings found" /> : null}
      {list.data?.bookings.map((b) => (
        <Card key={b._id}>
          <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "600", color: colors.text }}>{b.serviceType}</Text>
              <Body muted>{b.customerId?.name || "Customer"}{b.customerId?.phone ? ` · ${b.customerId.phone}` : ""}</Body>
            </View>
            <StatusBadge status={b.status} />
          </Row>
          <Body muted>{dateTime(b.scheduledAt || b.createdAt)} · {money(b.pricing?.finalPrice ?? b.estimatedPrice)}</Body>
          {b.address ? <Body muted numberOfLines={1}>{addressText(b.address)}</Body> : null}
        </Card>
      ))}
    </Screen>
  );
}
