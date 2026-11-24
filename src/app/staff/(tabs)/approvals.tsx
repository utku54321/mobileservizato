import React, { useState } from "react";
import { Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import { api, errorText } from "@/lib/api";
import { dateTime, label, money } from "@/lib/format";
import { Body, Button, Card, Chip, colors, Empty, ErrorBox, Field, KeyValue, Loading, Notice, Row, Screen, StatusBadge } from "@/components/ui";

interface ProviderRow {
  _id: string;
  companyName: string;
  businessType?: string;
  email: string;
  phone: string;
  verificationStatus: string;
  reviewVersion: number;
  reviewSubmittedAt?: string;
  createdAt: string;
}
interface OfferingRow {
  _id: string;
  name: string;
  providerName: string;
  providerVerificationStatus: string;
  catalogName: string;
  approvalStatus: string;
  reviewVersion: number;
  price: number;
  currency: string;
  unit: string;
  pricingModel: string;
  description?: string;
  createdAt: string;
}
type Action = "approve" | "request_changes" | "reject";

function Decision({ kind, id, version, onDone }: { kind: "providers" | "offerings"; id: string; version: number; onDone: () => void }) {
  const [action, setAction] = useState<Action | null>(null);
  const [reason, setReason] = useState("");
  const [requestId, setRequestId] = useState(() => Crypto.randomUUID());
  const decide = useMutation({
    mutationFn: () => api.post(`/api/admin/${kind}/${id}/decision`, { action, reason: reason.trim(), requestId, expectedVersion: version }),
    onSuccess: () => {
      setAction(null);
      setReason("");
      setRequestId(Crypto.randomUUID());
      onDone();
    },
  });
  const needsReason = action === "request_changes" || action === "reject";
  return (
    <View style={{ gap: 8, marginTop: 6 }}>
      <Row style={{ flexWrap: "wrap" }}>
        <Chip text="Approve" active={action === "approve"} onPress={() => setAction("approve")} />
        <Chip text="Request changes" active={action === "request_changes"} onPress={() => setAction("request_changes")} />
        <Chip text="Reject" active={action === "reject"} onPress={() => setAction("reject")} />
      </Row>
      {action ? (
        <>
          <Field label={needsReason ? "Reason (sent to the provider)" : "Note (optional)"} value={reason} onChangeText={setReason} multiline maxLength={1000} />
          {decide.error ? <Notice text={errorText(decide.error)} tone="danger" /> : null}
          <Button title={`Confirm: ${label(action)}`} variant={action === "reject" ? "danger" : "primary"}
            disabled={needsReason && reason.trim().length < 5} loading={decide.isPending} onPress={() => decide.mutate()} />
        </>
      ) : null}
    </View>
  );
}

export default function Approvals() {
  const client = useQueryClient();
  const [tab, setTab] = useState<"providers" | "offerings">("providers");
  const providers = useQuery({
    queryKey: ["admin-providers"],
    queryFn: () => api.get<{ items: ProviderRow[] }>("/api/admin/providers?status=pending&limit=30"),
  });
  const offerings = useQuery({
    queryKey: ["admin-offerings"],
    queryFn: () => api.get<{ items: OfferingRow[] }>("/api/admin/offerings?status=pending&limit=30"),
  });
  const done = () => {
    for (const key of ["admin-providers", "admin-offerings", "admin-overview"]) client.invalidateQueries({ queryKey: [key] });
  };
  const active = tab === "providers" ? providers : offerings;

  return (
    <Screen refreshing={active.isRefetching} onRefresh={active.refetch}>
      <Row>
        <Chip text={`Providers${providers.data ? ` (${providers.data.items.length})` : ""}`} active={tab === "providers"} onPress={() => setTab("providers")} />
        <Chip text={`Services${offerings.data ? ` (${offerings.data.items.length})` : ""}`} active={tab === "offerings"} onPress={() => setTab("offerings")} />
      </Row>
      {active.isLoading ? <Loading /> : null}
      <ErrorBox error={active.error} onRetry={active.refetch} />

      {tab === "providers" ? (
        <>
          {providers.data && providers.data.items.length === 0 ? <Empty title="No providers waiting" /> : null}
          {providers.data?.items.map((p) => (
            <Card key={p._id}>
              <Row style={{ justifyContent: "space-between" }}>
                <Text style={{ fontWeight: "600", fontSize: 15, color: colors.text, flex: 1 }}>{p.companyName}</Text>
                <StatusBadge status={p.verificationStatus} />
              </Row>
              {p.businessType ? <Body muted>{p.businessType}</Body> : null}
              <KeyValue k="Email" v={p.email} />
              <KeyValue k="Phone" v={p.phone} />
              <KeyValue k="Submitted" v={dateTime(p.reviewSubmittedAt || p.createdAt)} />
              <Decision kind="providers" id={p._id} version={p.reviewVersion} onDone={done} />
            </Card>
          ))}
        </>
      ) : (
        <>
          {offerings.data && offerings.data.items.length === 0 ? <Empty title="No services waiting" /> : null}
          {offerings.data?.items.map((o) => (
            <Card key={o._id}>
              <Row style={{ justifyContent: "space-between" }}>
                <Text style={{ fontWeight: "600", fontSize: 15, color: colors.text, flex: 1 }}>{o.name}</Text>
                <StatusBadge status={o.approvalStatus} />
              </Row>
              <Body muted>{o.providerName} · {label(o.providerVerificationStatus)}</Body>
              <KeyValue k="Catalog item" v={o.catalogName} />
              <KeyValue k="Price" v={`${money(o.price, o.currency)} / ${o.unit} (${label(o.pricingModel)})`} />
              {o.description ? <Body>{o.description}</Body> : null}
              <Decision kind="offerings" id={o._id} version={o.reviewVersion} onDone={done} />
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}
