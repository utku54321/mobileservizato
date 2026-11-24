import React, { useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, errorText } from "@/lib/api";
import { payInvoice } from "@/lib/payments";
import { dateTime, label, money } from "@/lib/format";
import type { InvoiceDetail } from "@/lib/types";
import { Body, Button, Card, colors, ErrorBox, H2, KeyValue, Loading, Notice, Row, Screen, StatusBadge } from "@/components/ui";

export default function InvoiceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const client = useQueryClient();
  const [paidNote, setPaidNote] = useState("");
  const q = useQuery({
    queryKey: ["customer-invoice", id],
    queryFn: () => api.get<{ invoice: InvoiceDetail }>(`/api/customer/invoices/${id}`),
    refetchInterval: 10_000,
  });
  const pay = useMutation({
    mutationFn: () => payInvoice(id, q.data?.invoice.invoiceNumber),
    onSuccess: () => {
      setPaidNote("Payment received. Thank you!");
      client.invalidateQueries({ queryKey: ["customer-invoice", id] });
      client.invalidateQueries({ queryKey: ["customer-invoices"] });
      client.invalidateQueries({ queryKey: ["customer-booking"] });
    },
  });

  if (q.isLoading) return <Loading />;
  if (!q.data) return <Screen><ErrorBox error={q.error} onRetry={q.refetch} /></Screen>;
  const inv = q.data.invoice;
  const cur = inv.currency || "INR";

  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Card>
        <Row style={{ justifyContent: "space-between" }}>
          <H2>{inv.invoiceNumber}</H2>
          <StatusBadge status={inv.status} />
        </Row>
        <KeyValue k="Issued" v={dateTime(inv.issuedAt || inv.createdAt)} />
        {inv.dueDate ? <KeyValue k="Due" v={dateTime(inv.dueDate)} /> : null}
      </Card>

      <Card>
        {inv.items?.map((it, i) => (
          <Row key={i} style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>
              <Body>{it.description}</Body>
              <Body muted>{it.qty} × {money(it.unitPrice, cur)}</Body>
            </View>
            <Body>{money(it.amount, cur)}</Body>
          </Row>
        ))}
        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 6 }} />
        <KeyValue k="Subtotal" v={money(inv.subtotal, cur)} />
        {inv.discountAmount ? <KeyValue k="Discount" v={`− ${money(inv.discountAmount, cur)}`} /> : null}
        <KeyValue k={`Tax${inv.taxPercent ? ` (${inv.taxPercent}%)` : ""}`} v={money(inv.taxAmount, cur)} />
        <Row style={{ justifyContent: "space-between" }}>
          <Text style={{ fontWeight: "700", color: colors.text }}>Total</Text>
          <Text style={{ fontWeight: "700", color: colors.text }}>{money(inv.grandTotal, cur)}</Text>
        </Row>
        <KeyValue k="Paid" v={money(inv.amountPaid, cur)} />
        <KeyValue k="Balance due" v={money(inv.balanceDue, cur)} />
        {inv.paymentMethod ? <KeyValue k="Paid via" v={label(inv.paymentMethod)} /> : null}
      </Card>

      {inv.notes ? <Notice text={inv.notes} /> : null}
      {paidNote ? <Notice text={paidNote} tone="success" /> : null}
      {pay.error ? <Notice text={errorText(pay.error)} tone="danger" /> : null}
      {inv.balanceDue > 0 && inv.status !== "draft" ? (
        <Button title={`Pay ${money(inv.balanceDue, cur)}`} loading={pay.isPending} onPress={() => pay.mutate()} />
      ) : null}
    </Screen>
  );
}
