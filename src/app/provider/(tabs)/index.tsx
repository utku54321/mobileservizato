import React from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { dateTime, idOf, label, money } from "@/lib/format";
import { openWeb } from "@/components/shared";
import { Body, Button, Card, colors, ErrorBox, H2, Loading, Notice, Row, Screen, Stat, StatusBadge } from "@/components/ui";

interface Dashboard {
  provider: { companyName: string; verificationStatus?: string; status?: string; trial?: { daysRemaining?: number } };
  stats: {
    pendingBookingRequests: number;
    confirmedBookings: number;
    activeJobs: number;
    completedJobs: number;
    technicians: number;
    availableTechnicians: number;
    activeServices: number;
    customers: number;
    revenue: number;
  };
  activeJobsList: Array<{
    _id: string;
    status: string;
    scheduledAt?: string;
    technicianId?: { userId?: { name?: string } };
    bookingId?: { _id: string; serviceType?: string; customerId?: { name?: string } };
  }>;
}

export default function ProviderDashboard() {
  const q = useQuery({
    queryKey: ["provider-dashboard"],
    queryFn: () => api.get<Dashboard>("/api/service-provider/dashboard"),
    refetchInterval: 20_000,
  });

  if (q.isLoading) return <Loading />;
  if (!q.data) {
    return (
      <Screen>
        <ErrorBox error={q.error} onRetry={q.refetch} />
        <Button title="Finish business setup on the website" variant="secondary" onPress={() => openWeb("/service-provider/onboarding")} />
      </Screen>
    );
  }
  const { provider, stats, activeJobsList } = q.data;
  const verified = provider.verificationStatus === "verified" || provider.verificationStatus === "approved";

  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Row style={{ justifyContent: "space-between" }}>
        <H2>{provider.companyName}</H2>
        <StatusBadge status={provider.verificationStatus} />
      </Row>
      {!verified ? (
        <Card>
          <Notice tone="warning" text={`Verification: ${label(provider.verificationStatus)}. Customers can book you once Servizato approves your business.`} />
          <Button title="Complete onboarding" variant="secondary" onPress={() => openWeb("/service-provider/onboarding")} />
        </Card>
      ) : null}
      {provider.trial?.daysRemaining !== undefined && provider.trial.daysRemaining !== null ? (
        <Body muted>Trial: {provider.trial.daysRemaining} days left</Body>
      ) : null}

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <Stat title="New requests" value={stats.pendingBookingRequests} />
        <Stat title="Active jobs" value={stats.activeJobs} />
        <Stat title="Confirmed bookings" value={stats.confirmedBookings} />
        <Stat title="Completed jobs" value={stats.completedJobs} />
        <Stat title="Pros available" value={`${stats.availableTechnicians}/${stats.technicians}`} />
        <Stat title="Revenue" value={money(stats.revenue)} />
      </View>

      {stats.pendingBookingRequests ? (
        <Button title={`Review ${stats.pendingBookingRequests} new request${stats.pendingBookingRequests > 1 ? "s" : ""}`} onPress={() => router.push("/provider/requests")} />
      ) : null}

      <H2>Jobs in progress</H2>
      {activeJobsList.length === 0 ? <Body muted>No active jobs right now.</Body> : null}
      {activeJobsList.map((j) => (
        <Card key={j._id} onPress={() => j.bookingId && router.push(`/provider/booking/${idOf(j.bookingId)}`)}>
          <Row style={{ justifyContent: "space-between" }}>
            <Text style={{ fontWeight: "600", color: colors.text, flex: 1 }}>{j.bookingId?.serviceType || "Job"}</Text>
            <StatusBadge status={j.status} />
          </Row>
          <Body muted>
            {j.bookingId?.customerId?.name || "Customer"} · Pro: {j.technicianId?.userId?.name || "—"}
          </Body>
          <Body muted>{dateTime(j.scheduledAt)}</Body>
        </Card>
      ))}
    </Screen>
  );
}
