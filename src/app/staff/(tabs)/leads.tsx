import React from "react";
import { Linking, Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { dateTime, label } from "@/lib/format";
import { Body, Button, Card, colors, Empty, ErrorBox, Loading, Row, Screen, StatusBadge } from "@/components/ui";

interface Lead {
  _id: string;
  name?: string;
  phone?: string;
  email?: string;
  serviceRequested: string;
  source?: string;
  status: string;
  remarks?: string;
  createdAt: string;
}

export default function Leads() {
  const q = useQuery({
    queryKey: ["staff-leads"],
    queryFn: () => api.get<{ leads: Lead[]; total: number }>("/api/leads?page=1&limit=50"),
  });
  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Button title="New lead" onPress={() => router.push("/staff/new-lead")} />
      {q.isLoading ? <Loading /> : null}
      <ErrorBox error={q.error} onRetry={q.refetch} />
      {q.data && q.data.leads.length === 0 ? <Empty title="No leads yet" /> : null}
      {q.data?.leads.map((l) => (
        <Card key={l._id}>
          <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "600", color: colors.text }}>{l.name || l.phone || "Lead"}</Text>
              <Body muted>{l.serviceRequested}{l.source ? ` · ${label(l.source)}` : ""}</Body>
            </View>
            <StatusBadge status={l.status === "booked" ? "completed" : l.status === "not_interested" ? "cancelled" : "pending"} text={label(l.status)} />
          </Row>
          {l.remarks ? <Body>{l.remarks}</Body> : null}
          <Body muted>{dateTime(l.createdAt)}</Body>
          {l.phone ? <Button title={`Call ${l.phone}`} variant="ghost" onPress={() => Linking.openURL(`tel:${l.phone}`)} /> : null}
        </Card>
      ))}
    </Screen>
  );
}
