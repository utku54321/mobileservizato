import React from "react";
import { Alert, Text } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, errorText } from "@/lib/api";
import { addressText, dateTime, money } from "@/lib/format";
import type { Address } from "@/lib/types";
import { Body, Button, Card, colors, Empty, ErrorBox, Loading, Notice, Row, Screen, StatusBadge } from "@/components/ui";

interface BookingRequest {
  _id: string;
  serviceName: string;
  customerId?: { name?: string };
  address?: Address;
  preferredDate?: string;
  description?: string;
  pricing?: { finalPrice?: number };
  coverage: { status: "matched" | "outside" | "uncertain"; requiresProviderConfirmation: boolean };
  coverageReviewToken: string;
}

export default function Requests() {
  const client = useQueryClient();
  const q = useQuery({
    queryKey: ["provider-booking-requests"],
    queryFn: () => api.get<{ requests: BookingRequest[] }>("/api/service-provider/booking-requests?limit=30"),
    refetchInterval: 15_000,
  });
  const done = () => {
    client.invalidateQueries({ queryKey: ["provider-booking-requests"] });
    client.invalidateQueries({ queryKey: ["provider-dashboard"] });
    client.invalidateQueries({ queryKey: ["provider-bookings"] });
  };
  const accept = useMutation({
    mutationFn: (r: BookingRequest) =>
      api.post(`/api/service-provider/booking-requests/${r._id}/accept`, {
        coverageReviewToken: r.coverageReviewToken,
        ...(r.coverage.requiresProviderConfirmation ? { confirmOutOfArea: true } : {}),
      }),
    onSuccess: done,
  });
  const decline = useMutation({
    mutationFn: (id: string) => api.post(`/api/service-provider/booking-requests/${id}/decline`, {}),
    onSuccess: done,
  });

  function confirmAccept(r: BookingRequest) {
    if (!r.coverage.requiresProviderConfirmation) return accept.mutate(r);
    Alert.alert(
      "Outside your service area?",
      "This address may be outside your listed coverage. Accept only if you can serve it.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Accept anyway", onPress: () => accept.mutate(r) },
      ],
    );
  }

  const err = accept.error || decline.error;
  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      {q.isLoading ? <Loading /> : null}
      <ErrorBox error={q.error} onRetry={q.refetch} />
      {err ? <Notice text={errorText(err)} tone="danger" /> : null}
      {q.data && q.data.requests.length === 0 ? <Empty title="No new requests" text="New customer booking requests show up here." /> : null}
      {q.data?.requests.map((r) => (
        <Card key={r._id}>
          <Row style={{ justifyContent: "space-between" }}>
            <Text style={{ fontWeight: "600", fontSize: 15, color: colors.text, flex: 1 }}>{r.serviceName}</Text>
            <Text style={{ fontWeight: "700", color: colors.text }}>{money(r.pricing?.finalPrice)}</Text>
          </Row>
          <Body>{r.customerId?.name || "Customer"}</Body>
          <Body muted>{r.preferredDate ? dateTime(r.preferredDate) : "Flexible time"}</Body>
          <Body muted>{addressText(r.address)}</Body>
          {r.description ? <Body>“{r.description}”</Body> : null}
          {r.coverage.status !== "matched" ? (
            <StatusBadge status="pending" text={r.coverage.status === "outside" ? "Outside coverage" : "Coverage unclear"} />
          ) : null}
          <Row style={{ marginTop: 6 }}>
            <Button title="Decline" variant="secondary" style={{ flex: 1 }}
              loading={decline.isPending && decline.variables === r._id} onPress={() => decline.mutate(r._id)} />
            <Button title="Accept" style={{ flex: 1 }}
              loading={accept.isPending && accept.variables?._id === r._id} onPress={() => confirmAccept(r)} />
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
