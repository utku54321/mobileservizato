import React, { useEffect, useRef, useState } from "react";
import { Image, Linking, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { api, errorText } from "@/lib/api";
import { ensureLocationPermission } from "@/lib/location";
import { uploadPhoto } from "@/lib/upload";
import { addressText, dateTime, money } from "@/lib/format";
import type { TechnicianJobDetail, TechnicianJourney } from "@/lib/types";
import { Body, Button, Card, colors, ErrorBox, Field, H2, KeyValue, Loading, Notice, Row, Screen, StatusBadge } from "@/components/ui";

export default function TechnicianJobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const client = useQueryClient();
  const q = useQuery({
    queryKey: ["technician-job", id],
    queryFn: () => api.get<TechnicianJobDetail>(`/api/technician/jobs/${id}`),
    refetchInterval: 10_000,
    gcTime: 0,
  });
  const refresh = () => {
    client.invalidateQueries({ queryKey: ["technician-job", id] });
    client.invalidateQueries({ queryKey: ["technician-jobs"] });
  };
  const action = useMutation({
    mutationFn: ({ path, body }: { path: string; body?: unknown }) => api.post(`/api/technician/jobs/${id}/${path}`, body),
    onSettled: refresh,
  });
  const [otp, setOtp] = useState("");

  if (q.isLoading) return <Loading />;
  if (!q.data) return <Screen><ErrorBox error={q.error} onRetry={q.refetch} /></Screen>;

  const { job, workflow, journey } = q.data;
  const b = job.bookingId;
  const coords = b?.address?.location?.coordinates;
  const destination = coords ? `${coords[1]},${coords[0]}` : encodeURIComponent(addressText(b?.address));
  const busy = action.isPending;

  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Card>
        <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <H2>{b?.serviceType || "Service job"}</H2>
            {b?.subService ? <Body muted>{b.subService}</Body> : null}
          </View>
          <StatusBadge status={job.status} />
        </Row>
        <KeyValue k="When" v={dateTime(job.scheduledAt || b?.scheduledAt)} />
        {b?.pricing?.finalPrice ? <KeyValue k="Price" v={money(b.pricing.finalPrice)} /> : null}
        {b?.notes ? <Body>{b.notes}</Body> : null}
      </Card>

      <Card>
        <H2>{b?.customerId?.name || "Customer"}</H2>
        {b?.address ? <Body>{addressText(b.address)}</Body> : <Body muted>Address is shown once the job is active.</Body>}
        <Row>
          {b?.customerId?.phone ? (
            <Button title="Call" variant="secondary" style={{ flex: 1 }} onPress={() => Linking.openURL(`tel:${b.customerId!.phone}`)} />
          ) : null}
          {b?.address ? (
            <Button title="Navigate" variant="secondary" style={{ flex: 1 }}
              onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destination}`)} />
          ) : null}
        </Row>
      </Card>

      {workflow?.access === "read_only" && workflow.reason ? <Notice text={workflow.reason} tone="warning" /> : null}
      {action.error ? <Notice text={errorText(action.error)} tone="danger" /> : null}

      {journey?.canTrack ? <LocationSharing jobId={id} journey={journey} onArrived={refresh} /> : null}

      {workflow?.canAccept ? (
        <Button title="Accept & start travelling" loading={busy} onPress={() => action.mutate({ path: "accept" })} />
      ) : null}
      {workflow?.canArrive ? (
        <Button title="I've arrived" loading={busy} onPress={() => action.mutate({ path: "arrive" })} />
      ) : null}
      {workflow?.canStart ? (
        <Card>
          <H2>Start the job</H2>
          <Body muted>Ask the customer for the code shown in their app.</Body>
          <Field label="Customer OTP" value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6} />
          <Button title="Verify & start" loading={busy} disabled={otp.length < 4} onPress={() => action.mutate({ path: "start", body: { otp } })} />
        </Card>
      ) : null}

      {workflow?.canManageParts || (job.partsUsed?.length ?? 0) > 0 ? (
        <Parts jobId={id} parts={job.partsUsed || []} editable={Boolean(workflow?.canManageParts)} onChange={refresh} />
      ) : null}

      {workflow?.canUploadProof || (job.proofIds?.length ?? 0) > 0 ? (
        <Proof jobId={id} job={q.data} editable={Boolean(workflow?.canUploadProof)} onChange={refresh} />
      ) : null}

      {workflow?.canComplete ? (
        <Button title="Mark job complete" loading={busy} onPress={() => action.mutate({ path: "complete" })} />
      ) : null}
      {job.status === "completed" ? <Notice text={`Completed ${dateTime(job.endTime)}. Payment: ${job.paymentStatus || "pending"}.`} tone="success" /> : null}
    </Screen>
  );
}

/** Foreground location sharing while travelling, at the interval the server asks for. */
function LocationSharing({ jobId, journey, onArrived }: { jobId: string; journey: TechnicianJourney; onArrived: () => void }) {
  const [state, setState] = useState<"starting" | "sharing" | "denied" | "error">("starting");
  const [last, setLast] = useState<number | null>(null);
  const lastSent = useRef(0);
  // Keep the latest callback without restarting the GPS watcher on every re-render.
  const arrivedRef = useRef(onArrived);
  arrivedRef.current = onArrived;

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    (async () => {
      if (!(await ensureLocationPermission())) return setState("denied");
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: Math.max(5000, journey.clientIntervalMs), distanceInterval: 10 },
        async (pos) => {
          if (cancelled) return;
          const now = Date.now();
          if (now - lastSent.current < Math.max(5000, journey.clientIntervalMs) - 500) return;
          lastSent.current = now;
          try {
            const result = await api.post<{ transitioned?: boolean; status?: string }>(`/api/technician/jobs/${jobId}/location`, {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: Math.max(1, Math.round(pos.coords.accuracy ?? 50)),
              observedAt: Math.round(pos.timestamp || now),
            });
            setState("sharing");
            setLast(now);
            if (result?.transitioned || result?.status === "arrived") arrivedRef.current();
          } catch {
            setState("error");
          }
        },
      );
    })();
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [jobId, journey.clientIntervalMs]);

  const text =
    state === "denied"
      ? "Location permission is off, so the customer can't see you travelling. You can still tap “I've arrived”."
      : state === "error"
        ? "Couldn't send your location just now. Retrying…"
        : state === "sharing"
          ? `Sharing your location with the customer${last ? ` · updated ${new Date(last).toLocaleTimeString()}` : ""}. Keep this screen open while you travel.`
          : "Starting location sharing…";
  return <Notice text={text} tone={state === "sharing" ? "success" : state === "starting" ? "info" : "warning"} />;
}

function Parts({ jobId, parts, editable, onChange }: { jobId: string; parts: { partName: string; qty: number; price?: number }[]; editable: boolean; onChange: () => void }) {
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");
  const add = useMutation({
    mutationFn: () => api.post(`/api/technician/jobs/${jobId}/parts`, { partName: name.trim(), qty: Number(qty), price: Number(price || 0) }),
    onSuccess: () => { setName(""); setQty("1"); setPrice(""); onChange(); },
  });
  const remove = useMutation({
    mutationFn: (index: number) => api.del(`/api/technician/jobs/${jobId}/parts/${index}`),
    onSuccess: onChange,
  });
  return (
    <Card>
      <H2>Parts used</H2>
      {parts.length === 0 ? <Body muted>No parts added.</Body> : null}
      {parts.map((p, i) => (
        <Row key={`${p.partName}-${i}`} style={{ justifyContent: "space-between" }}>
          <Body>{p.partName} × {p.qty}{p.price ? ` · ${money(p.price)}` : ""}</Body>
          {editable ? <Button title="Remove" variant="ghost" loading={remove.isPending && remove.variables === i} onPress={() => remove.mutate(i)} /> : null}
        </Row>
      ))}
      {editable ? (
        <>
          <Field label="Part name" value={name} onChangeText={setName} />
          <Row>
            <View style={{ flex: 1 }}><Field label="Qty" value={qty} onChangeText={setQty} keyboardType="number-pad" /></View>
            <View style={{ flex: 1 }}><Field label="Price each (₹)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" /></View>
          </Row>
          {add.error || remove.error ? <Notice text={errorText(add.error || remove.error)} tone="danger" /> : null}
          <Button title="Add part" variant="secondary" loading={add.isPending} disabled={!name.trim() || !(Number(qty) > 0)} onPress={() => add.mutate()} />
        </>
      ) : null}
    </Card>
  );
}

function Proof({ jobId, job, editable, onChange }: { jobId: string; job: TechnicianJobDetail; editable: boolean; onChange: () => void }) {
  const [photos, setPhotos] = useState<{ uri: string; mime?: string }[]>([]);
  const [note, setNote] = useState("");
  const existing = (job.job.proofIds || []).filter((p): p is { _id: string; url?: string; thumbnailUrl?: string } => typeof p === "object");

  async function pick(camera: boolean) {
    if (camera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return;
    }
    const result = camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.6 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.6, allowsMultipleSelection: true, selectionLimit: 6 });
    if (result.canceled) return;
    setPhotos((list) => [...list, ...result.assets.map((a) => ({ uri: a.uri, mime: a.mimeType ?? undefined }))].slice(0, 6));
  }

  const submit = useMutation({
    mutationFn: async () => {
      const uploaded = [];
      for (const p of photos) uploaded.push(await uploadPhoto(p.uri, p.mime));
      return api.post(`/api/technician/jobs/${jobId}/proof`, {
        proofNote: note.trim() || null,
        proofs: uploaded.map((u) => ({ url: u.url, type: "photo", metadata: { public_id: u.publicId } })),
      });
    },
    onSuccess: () => { setPhotos([]); setNote(""); onChange(); },
  });

  return (
    <Card>
      <H2>Work photos{job.job.proofRequired ? " (required)" : ""}</H2>
      {existing.length ? (
        <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
          {existing.map((p) => (
            <Image key={p._id} source={{ uri: p.thumbnailUrl || p.url }} style={{ width: 72, height: 72, borderRadius: 8, backgroundColor: colors.border }} />
          ))}
        </ScrollView>
      ) : null}
      {editable ? (
        <>
          {photos.length ? (
            <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
              {photos.map((p) => <Image key={p.uri} source={{ uri: p.uri }} style={{ width: 72, height: 72, borderRadius: 8 }} />)}
            </ScrollView>
          ) : null}
          <Row>
            <Button title="Take photo" variant="secondary" style={{ flex: 1 }} onPress={() => pick(true)} />
            <Button title="From gallery" variant="secondary" style={{ flex: 1 }} onPress={() => pick(false)} />
          </Row>
          <Field label="Note (optional)" value={note} onChangeText={setNote} multiline />
          {submit.error ? <Notice text={errorText(submit.error)} tone="danger" /> : null}
          <Button title={`Upload ${photos.length || ""} photo${photos.length === 1 ? "" : "s"}`} loading={submit.isPending} disabled={!photos.length} onPress={() => submit.mutate()} />
        </>
      ) : null}
      {!editable && !existing.length ? <Text style={{ color: colors.muted }}>No photos.</Text> : null}
    </Card>
  );
}
