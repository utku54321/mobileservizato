import React from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { dateTime, money } from "@/lib/format";
import type { InvoiceSummary } from "@/lib/types";
import { Body, Card, colors, Empty, ErrorBox, Loading, Row, Screen, StatusBadge } from "@/components/ui";

export default function Invoices() {
  const q = useQuery({
    queryKey: ["customer-invoices"],
    queryFn: () => api.get<{ invoices: InvoiceSummary[] }>("/api/customer/invoices?limit=30"),
  });
  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      {q.isLoading ? <Loading /> : null}
      <ErrorBox error={q.error} onRetry={q.refetch} />
      {q.data && q.data.invoices.length === 0 ? <Empty title="No bills yet" text="Bills appear here after a job is completed." /> : null}
      {q.data?.invoices.map((inv) => (
        <Card key={inv._id} onPress={() => router.push(`/customer/invoice/${inv._id}`)}>
          <Row style={{ justifyContent: "space-between" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "600", color: colors.text }}>{inv.invoiceNumber}</Text>
              <Body muted>
                {typeof inv.bookingId === "object" && inv.bookingId?.serviceType ? `${inv.bookingId.serviceType} · ` : ""}
                {dateTime(inv.issuedAt || inv.createdAt)}
              </Body>
            </View>
            <View style={{ alignItems: "flex-end", gap: 4 }}>
              <Text style={{ fontWeight: "700", color: colors.text }}>{money(inv.grandTotal, inv.currency)}</Text>
              <StatusBadge status={inv.balanceDue > 0 ? inv.status : "paid"} text={inv.balanceDue > 0 ? `Due ${money(inv.balanceDue, inv.currency)}` : "Paid"} />
            </View>
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
