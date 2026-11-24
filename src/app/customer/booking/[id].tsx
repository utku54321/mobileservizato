import React, { useState } from "react";
import { Linking, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import Ionicons from "@expo/vector-icons/Ionicons";
import { api, errorText } from "@/lib/api";
import { addressText, dateTime, money } from "@/lib/format";
import type { BookingDetail } from "@/lib/types";
import { Body, Button, Card, Chip, colors, ErrorBox, Field, H2, KeyValue, Loading, Notice, Row, Screen, StatusBadge } from "@/components/ui";

const LIVE_STATUSES = ["assigned", "enroute", "arrived"];

export default function BookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery({
    queryKey: ["customer-booking", id],
    queryFn: () => api.get<BookingDetail & { success: boolean }>(`/api/customer/bookings/${id}`),
    refetchInterval: 10_000,
  });

  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <Screen><ErrorBox error={q.error} onRetry={q.refetch} /></Screen>;

  const { booking, provider, service, technician, job, invoice, timeline, tracking } = q.data;
  const pro = technician?.userId;
  const jobStatus = job?.status;

  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Card>
        <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <H2>{service?.name || booking.serviceType}</H2>
            <Body muted>{provider?.companyName}</Body>
          </View>
          <StatusBadge status={jobStatus || booking.status} />
        </Row>
        {tracking?.description ? <Body>{tracking.description}</Body> : null}
        <KeyValue k="When" v={dateTime(job?.scheduledAt || booking.scheduledAt)} />
        <KeyValue k="Price" v={money(booking.pricing?.finalPrice ?? booking.estimatedPrice)} />
        {booking.address ? <Body muted>{addressText(booking.address)}</Body> : null}
        {provider?.phone ? (
          <Button title={`Call ${provider.companyName}`} variant="secondary" onPress={() => Linking.openURL(`tel:${provider.phone}`)} />
        ) : null}
      </Card>

      {job?.otp && jobStatus && ["assigned", "enroute", "arrived"].includes(jobStatus) ? (
        <Card style={{ borderColor: colors.brand }}>
          <Body muted>Share this code with your Pro only when they're at your door</Body>
          <Text style={{ fontSize: 32, fontWeight: "800", letterSpacing: 8, color: colors.text }}>{job.otp}</Text>
          {job.otpExpiresAt ? <Body muted>Valid until {dateTime(job.otpExpiresAt)}</Body> : null}
        </Card>
      ) : null}

      {pro ? (
        <Card>
          <H2>Your Pro</H2>
          <Row style={{ justifyContent: "space-between" }}>
            <Body>{pro.name || "Assigned Pro"}</Body>
            {pro.phone ? <Button title="Call" variant="secondary" onPress={() => Linking.openURL(`tel:${pro.phone}`)} /> : null}
          </Row>
        </Card>
      ) : null}

      {jobStatus && LIVE_STATUSES.includes(jobStatus) ? <Tracking bookingId={booking._id} /> : null}

      {invoice ? (
        <Card onPress={() => router.push(`/customer/invoice/${invoice._id}`)}>
          <Row style={{ justifyContent: "space-between" }}>
            <H2>Bill {invoice.invoiceNumber}</H2>
            <StatusBadge status={invoice.status} />
          </Row>
          <KeyValue k="Total" v={money(invoice.grandTotal, invoice.currency)} />
          <KeyValue k="Balance due" v={money(invoice.balanceDue, invoice.currency)} />
          {invoice.balanceDue > 0 ? <Button title="View & pay" onPress={() => router.push(`/customer/invoice/${invoice._id}`)} /> : null}
        </Card>
      ) : null}

      {timeline?.length ? (
        <Card>
          <H2>Progress</H2>
          {timeline.map((t) => (
            <Row key={t.key} style={{ alignItems: "flex-start", paddingVertical: 4 }}>
              <Ionicons
                name={t.completed ? "checkmark-circle" : t.current ? "radio-button-on" : "ellipse-outline"}
                size={18}
                color={t.completed ? colors.success : t.current ? colors.brand : colors.muted}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: t.current ? "700" : "500", color: colors.text }}>{t.title}</Text>
                <Body muted>{t.description}</Body>
                {t.timestamp ? <Body muted>{dateTime(t.timestamp)}</Body> : null}
              </View>
            </Row>
          ))}
        </Card>
      ) : null}

      {jobStatus === "completed" ? <Review bookingId={booking._id} /> : null}
      {booking.status !== "cancelled" && jobStatus !== "completed" ? <Cancel bookingId={booking._id} /> : null}
    </Screen>
  );
}

function Tracking({ bookingId }: { bookingId: string }) {
  const q = useQuery({
    queryKey: ["pro-tracking", bookingId],
    queryFn: () =>
      api.get<{ state: "current" | "stale" | "inactive" | "unavailable"; lastUpdated: string | null; coordinates?: [number, number] }>(
        `/api/customer/bookings/${bookingId}/tracking`,
      ),
    refetchInterval: 15_000,
    gcTime: 0,
  });
  const c = q.data?.coordinates;
  return (
    <Card>
      <H2>Pro location</H2>
      <Body muted>
        {q.data?.state === "current"
          ? "Your Pro is sharing their location."
          : q.data?.state === "stale"
            ? "Location isn't live right now."
            : "Location appears once your Pro starts travelling."}
      </Body>
      {q.data?.lastUpdated ? <Body muted>Last update: {dateTime(q.data.lastUpdated)}</Body> : null}
      {c && q.data?.state === "current" ? (
        <Button title="Open in Maps" variant="secondary" onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${c[1]},${c[0]}`)} />
      ) : null}
    </Card>
  );
}

function Stars({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <Row>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons key={n} name={n <= value ? "star" : "star-outline"} size={30} color="#F59E0B" onPress={() => onChange(n)} />
      ))}
    </Row>
  );
}

function Review({ bookingId }: { bookingId: string }) {
  const client = useQueryClient();
  const existing = useQuery({
    queryKey: ["booking-review", bookingId],
    queryFn: () => api.get<{ review: { providerRating: number; technicianRating: number; comment?: string } | null }>(`/api/customer/bookings/${bookingId}/review`),
  });
  const [provider, setProvider] = useState(0);
  const [pro, setPro] = useState(0);
  const [comment, setComment] = useState("");
  const save = useMutation({
    mutationFn: () => api.post(`/api/customer/bookings/${bookingId}/review`, { providerRating: provider, technicianRating: pro, comment }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["booking-review", bookingId] }),
  });

  if (existing.isLoading) return null;
  const review = existing.data?.review;
  if (review) {
    return (
      <Card>
        <H2>Your review</H2>
        <KeyValue k="Provider" v={"★".repeat(review.providerRating)} />
        <KeyValue k="Pro" v={"★".repeat(review.technicianRating)} />
        {review.comment ? <Body>{review.comment}</Body> : null}
      </Card>
    );
  }
  return (
    <Card>
      <H2>Rate this service</H2>
      <Body muted>Provider</Body>
      <Stars value={provider} onChange={setProvider} />
      <Body muted>Pro</Body>
      <Stars value={pro} onChange={setPro} />
      <Field label="Comment (optional)" value={comment} onChangeText={setComment} multiline maxLength={1000} />
      {save.error ? <Notice text={errorText(save.error)} tone="danger" /> : null}
      <Button title="Submit review" disabled={!provider || !pro} loading={save.isPending} onPress={() => save.mutate()} />
    </Card>
  );
}

function Cancel({ bookingId }: { bookingId: string }) {
  const client = useQueryClient();
  const info = useQuery({
    queryKey: ["booking-cancellation", bookingId],
    queryFn: () => api.get<{ canCancel: boolean; reasons: Record<string, string> }>(`/api/bookings/${bookingId}/cancellation`),
  });
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [requestId] = useState(() => Crypto.randomUUID());
  const cancel = useMutation({
    mutationFn: () =>
      api.post(`/api/bookings/${bookingId}/cancellation`, { action: "cancel", requestId, reason, ...(note.trim() ? { note: note.trim() } : {}) }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["customer-booking", bookingId] });
      client.invalidateQueries({ queryKey: ["customer-bookings"] });
      setOpen(false);
    },
  });
  if (!info.data?.canCancel) return null;
  if (!open) return <Button title="Cancel booking" variant="ghost" onPress={() => setOpen(true)} />;
  return (
    <Card>
      <H2>Cancel this booking?</H2>
      <View style={{ gap: 8 }}>
        {Object.entries(info.data.reasons).map(([key, text]) => (
          <Chip key={key} text={text} active={reason === key} onPress={() => setReason(key)} />
        ))}
      </View>
      <Field label="Anything else? (optional)" value={note} onChangeText={setNote} multiline maxLength={1000} />
      {cancel.error ? <Notice text={errorText(cancel.error)} tone="danger" /> : null}
      <Row>
        <Button title="Keep booking" variant="secondary" style={{ flex: 1 }} onPress={() => setOpen(false)} />
        <Button title="Cancel booking" variant="danger" style={{ flex: 1 }} disabled={!reason} loading={cancel.isPending} onPress={() => cancel.mutate()} />
      </Row>
    </Card>
  );
}
