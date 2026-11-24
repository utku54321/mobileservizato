import React from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { addressText, dateTime } from "@/lib/format";
import type { TechnicianJob } from "@/lib/types";
import { Body, Card, colors, Empty, ErrorBox, H2, Loading, Row, Screen, StatusBadge } from "@/components/ui";

const DONE = ["completed", "cancelled"];

function JobCard({ job }: { job: TechnicianJob }) {
  const b = job.bookingId;
  return (
    <Card onPress={() => router.push(`/technician/job/${job._id}`)}>
      <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "600", fontSize: 15, color: colors.text }}>{b?.serviceType || "Service job"}</Text>
          <Body muted>{b?.customerId?.name || "Customer"}</Body>
        </View>
        <StatusBadge status={job.status} />
      </Row>
      <Body muted>{dateTime(job.scheduledAt || b?.scheduledAt)}</Body>
      {b?.address ? <Body muted numberOfLines={1}>{addressText(b.address)}</Body> : null}
    </Card>
  );
}

export default function TechnicianJobs() {
  const q = useQuery({
    queryKey: ["technician-jobs"],
    queryFn: () => api.get<{ jobs: TechnicianJob[] }>("/api/technician/jobs"),
    refetchInterval: 20_000,
  });
  const jobs = q.data?.jobs || [];
  const active = jobs.filter((j) => !DONE.includes(j.status));
  const past = jobs.filter((j) => DONE.includes(j.status));

  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      {q.isLoading ? <Loading /> : null}
      <ErrorBox error={q.error} onRetry={q.refetch} />
      {q.data && jobs.length === 0 ? <Empty title="No jobs assigned yet" text="Your provider assigns jobs to you here." /> : null}
      {active.length ? <H2>Active</H2> : null}
      {active.map((j) => <JobCard key={j._id} job={j} />)}
      {past.length ? <H2>Past</H2> : null}
      {past.slice(0, 30).map((j) => <JobCard key={j._id} job={j} />)}
    </Screen>
  );
}
