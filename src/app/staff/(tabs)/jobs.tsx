import React, { useState } from "react";
import { Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, errorText } from "@/lib/api";
import { addressText, dateTime, idOf, label } from "@/lib/format";
import type { Address } from "@/lib/types";
import { Body, Button, Card, Chip, colors, Empty, ErrorBox, Loading, Notice, Row, Screen, StatusBadge } from "@/components/ui";

interface StaffJob {
  _id: string;
  status: string;
  scheduledAt?: string;
  serviceProviderId?: string;
  bookingId?: { _id: string; serviceType?: string; address?: Address; scheduledAt?: string } | null;
  technicianId?: { _id: string; userId?: string | { name?: string } } | null;
}
interface StaffTech {
  _id: string;
  status: string;
  isActive?: boolean;
  serviceProviderId?: string;
  userId?: { name?: string; phone?: string } | null;
}

const REASSIGNABLE = ["scheduled", "assigned"];

export default function StaffJobs() {
  const client = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const jobs = useQuery({
    queryKey: ["staff-jobs"],
    queryFn: () => api.get<{ jobs: StaffJob[]; total: number }>("/api/jobs?page=1&limit=50"),
    refetchInterval: 20_000,
  });
  const techs = useQuery({
    queryKey: ["staff-techs"],
    queryFn: () => api.get<{ technicians: StaffTech[] }>("/api/add-technicians?page=1&limit=200"),
    enabled: Boolean(openId),
  });
  const assign = useMutation({
    mutationFn: ({ jobId, technicianId }: { jobId: string; technicianId: string }) =>
      api.post(`/api/jobs/${jobId}/assign`, { technicianId }),
    onSuccess: () => {
      setOpenId(null);
      client.invalidateQueries({ queryKey: ["staff-jobs"] });
    },
  });

  return (
    <Screen refreshing={jobs.isRefetching} onRefresh={jobs.refetch}>
      {jobs.isLoading ? <Loading /> : null}
      <ErrorBox error={jobs.error} onRetry={jobs.refetch} />
      {jobs.data && jobs.data.jobs.length === 0 ? <Empty title="No jobs yet" /> : null}
      {jobs.data?.jobs.map((j) => {
        const techUser = j.technicianId?.userId;
        const techName = techUser && typeof techUser === "object" ? techUser.name : null;
        const open = openId === j._id;
        // Only the job's own provider's Pros can take it.
        const eligible = (techs.data?.technicians || []).filter(
          (t) => t.isActive !== false && (!j.serviceProviderId || !t.serviceProviderId || String(t.serviceProviderId) === String(j.serviceProviderId)),
        );
        return (
          <Card key={j._id}>
            <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "600", color: colors.text }}>{j.bookingId?.serviceType || "Job"}</Text>
                <Body muted>Pro: {techName || (j.technicianId ? "Assigned" : "Unassigned")}</Body>
              </View>
              <StatusBadge status={j.status} />
            </Row>
            <Body muted>{dateTime(j.scheduledAt || j.bookingId?.scheduledAt)}</Body>
            {j.bookingId?.address ? <Body muted numberOfLines={1}>{addressText(j.bookingId.address)}</Body> : null}
            {REASSIGNABLE.includes(j.status) ? (
              <Button title={open ? "Close" : j.technicianId ? "Reassign Pro" : "Assign Pro"} variant="secondary" onPress={() => setOpenId(open ? null : j._id)} />
            ) : null}
            {open ? (
              <View style={{ gap: 8 }}>
                {techs.isLoading ? <Loading /> : null}
                {assign.error ? <Notice text={errorText(assign.error)} tone="danger" /> : null}
                {techs.data && eligible.length === 0 ? <Body muted>No active Pros for this provider.</Body> : null}
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {eligible.map((t) => (
                    <Chip key={t._id} text={`${t.userId?.name || "Pro"} · ${label(t.status)}`} active={idOf(j.technicianId) === t._id}
                      onPress={() => assign.mutate({ jobId: j._id, technicianId: t._id })} />
                  ))}
                </View>
              </View>
            ) : null}
          </Card>
        );
      })}
    </Screen>
  );
}
