import React from "react";
import { Linking, Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { label } from "@/lib/format";
import type { Pro } from "@/lib/types";
import { Body, Button, Card, colors, Empty, ErrorBox, Loading, Row, Screen, StatusBadge } from "@/components/ui";

export default function Team() {
  const q = useQuery({
    queryKey: ["provider-technicians"],
    queryFn: () => api.get<{ technicians: Pro[] }>("/api/service-provider/technicians?limit=50"),
  });
  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Button title="Add a Pro" onPress={() => router.push("/provider/add-pro")} />
      {q.isLoading ? <Loading /> : null}
      <ErrorBox error={q.error} onRetry={q.refetch} />
      {q.data && q.data.technicians.length === 0 ? <Empty title="No Pros yet" text="Add your technicians so you can assign jobs." /> : null}
      {q.data?.technicians.map((t) => (
        <Card key={t._id}>
          <Row style={{ justifyContent: "space-between" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "600", color: colors.text }}>{t.userId?.name || "Pro"}</Text>
              <Body muted>{t.userId?.phone || t.userId?.email}</Body>
            </View>
            <StatusBadge status={t.isActive === false ? "suspended" : t.status === "available" ? "approved" : t.status} text={t.isActive === false ? "Inactive" : label(t.status)} />
          </Row>
          {t.skills?.length ? <Body muted>{t.skills.join(", ")}</Body> : null}
          {t.userId?.phone ? <Button title="Call" variant="ghost" onPress={() => Linking.openURL(`tel:${t.userId!.phone}`)} /> : null}
        </Card>
      ))}
    </Screen>
  );
}
