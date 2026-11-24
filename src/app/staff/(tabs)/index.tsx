import React from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button, ErrorBox, H2, Loading, Screen, Stat } from "@/components/ui";

interface Overview {
  metrics: {
    pendingProviders: number;
    changesRequested: number;
    pendingOfferings: number;
    approvedActiveProviders: number;
    activeCatalogServices: number;
  };
}

export default function AdminOverview() {
  const q = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => api.get<Overview>("/api/admin/overview"),
    refetchInterval: 30_000,
  });
  if (q.isLoading) return <Loading />;
  if (!q.data) return <Screen><ErrorBox error={q.error} onRetry={q.refetch} /></Screen>;
  const m = q.data.metrics;
  const pending = m.pendingProviders + m.pendingOfferings;
  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      <H2>Marketplace</H2>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <Stat title="Providers to review" value={m.pendingProviders} />
        <Stat title="Services to review" value={m.pendingOfferings} />
        <Stat title="Changes requested" value={m.changesRequested} />
        <Stat title="Live providers" value={m.approvedActiveProviders} />
        <Stat title="Active catalog services" value={m.activeCatalogServices} />
      </View>
      {pending ? <Button title={`Review ${pending} pending item${pending > 1 ? "s" : ""}`} onPress={() => router.push("/staff/approvals")} /> : null}
      <Button title="Jobs" variant="secondary" onPress={() => router.push("/staff/jobs")} />
      <Button title="Leads" variant="secondary" onPress={() => router.push("/staff/leads")} />
    </Screen>
  );
}
