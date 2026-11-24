import React from "react";
import { Linking, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, errorText } from "@/lib/api";
import { addressText, dateTime, label, money } from "@/lib/format";
import type { Address, Pro } from "@/lib/types";
import { Body, Button, Card, colors, ErrorBox, H2, KeyValue, Loading, Notice, Row, Screen, StatusBadge } from "@/components/ui";

interface Detail {
  booking: {
    _id: string;
    serviceType: string;
    status: string;
    scheduledAt?: string;
    address?: Address;
    notes?: string;
    pricing?: { finalPrice?: number; quantity?: number };
    customerId?: { name?: string; phone?: string; email?: string };
    serviceOfferingId?: { name?: string; description?: string };
    technicianId?: string | null;
  };
  job?: { _id: string; status: string; scheduledAt?: string; paymentStatus?: string } | null;
  technicians: Pro[];
}

const LOCKED = ["enroute", "arrived", "otp_verified", "in_progress", "on_hold", "completed", "cancelled"];

export default function ProviderBookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const client = useQueryClient();
  const q = useQuery({
    queryKey: ["provider-booking", id],
    queryFn: () => api.get<Detail>(`/api/service-provider/bookings/${id}`),
    refetchInterval: 15_000,
  });
  const assign = useMutation({
    mutationFn: (technicianId: string) => api.post(`/api/service-provider/bookings/${id}/assign-technician`, { technicianId }),
    onSuccess: () => {
      for (const key of ["provider-booking", "provider-bookings", "provider-dashboard"]) client.invalidateQueries({ queryKey: [key] });
    },
  });

  if (q.isLoading) return <Loading />;
  if (!q.data) return <Screen><ErrorBox error={q.error} onRetry={q.refetch} /></Screen>;
  const { booking, job, technicians } = q.data;
  const canAssign = booking.status !== "cancelled" && !(job && LOCKED.includes(job.status));
  const assignedId = booking.technicianId ? String(booking.technicianId) : null;

  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Card>
        <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <H2>{booking.serviceOfferingId?.name || booking.serviceType}</H2>
          </View>
          <StatusBadge status={job?.status || booking.status} />
        </Row>
        <KeyValue k="When" v={dateTime(job?.scheduledAt || booking.scheduledAt)} />
        <KeyValue k="Price" v={money(booking.pricing?.finalPrice)} />
        {booking.pricing?.quantity && booking.pricing.quantity > 1 ? <KeyValue k="Quantity" v={booking.pricing.quantity} /> : null}
        {job?.paymentStatus ? <KeyValue k="Payment" v={label(job.paymentStatus)} /> : null}
        {booking.notes ? <Body>{booking.notes}</Body> : null}
      </Card>

      <Card>
        <H2>{booking.customerId?.name || "Customer"}</H2>
        {booking.address ? <Body>{addressText(booking.address)}</Body> : null}
        {booking.customerId?.phone ? (
          <Button title="Call customer" variant="secondary" onPress={() => Linking.openURL(`tel:${booking.customerId!.phone}`)} />
        ) : null}
      </Card>

      <H2>{assignedId ? "Assigned Pro" : "Assign a Pro"}</H2>
      {assign.error ? <Notice text={errorText(assign.error)} tone="danger" /> : null}
      {technicians.length === 0 ? <Notice text="Add Pros in the Pros tab before assigning jobs." tone="warning" /> : null}
      {technicians.map((t) => {
        const current = assignedId === t._id;
        return (
          <Card key={t._id} style={current ? { borderColor: colors.brand } : undefined}>
            <Row style={{ justifyContent: "space-between" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "600", color: colors.text }}>{t.userId?.name || "Pro"}</Text>
                <Body muted>{(t.skills || []).slice(0, 3).join(", ") || "—"}</Body>
              </View>
              <StatusBadge status={t.status === "available" ? "approved" : t.status} text={label(t.status)} />
            </Row>
            {canAssign && !current ? (
              <Button title={assignedId ? "Reassign to this Pro" : "Assign"} variant={assignedId ? "secondary" : "primary"}
                loading={assign.isPending && assign.variables === t._id} onPress={() => assign.mutate(t._id)} />
            ) : current ? <Body style={{ color: colors.brand }}>Currently assigned</Body> : null}
          </Card>
        );
      })}
    </Screen>
  );
}
