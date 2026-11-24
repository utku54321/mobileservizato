import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import { api, errorText } from "@/lib/api";
import { currentReading, suggestAddress, type GpsReading } from "@/lib/location";
import { priceText } from "@/lib/pricing";
import { money } from "@/lib/format";
import type { Address, DiscoveryOffering } from "@/lib/types";
import { Body, Button, Card, Chip, Field, H2, KeyValue, Notice, Row, Screen } from "@/components/ui";

function slots() {
  const at = (days: number, hour: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(hour, 0, 0, 0);
    return d;
  };
  const now = Date.now() + 60 * 60_000; // at least an hour ahead
  const list: { label: string; value?: string }[] = [{ label: "Flexible / ASAP" }];
  for (const [days, hour, label] of [
    [0, 14, "Today 2 PM"],
    [0, 18, "Today 6 PM"],
    [1, 10, "Tomorrow 10 AM"],
    [1, 14, "Tomorrow 2 PM"],
    [1, 18, "Tomorrow 6 PM"],
    [2, 10, "Day after 10 AM"],
  ] as const) {
    const d = at(days, hour);
    if (d.getTime() > now) list.push({ label, value: d.toISOString() });
  }
  return list;
}

export default function Book() {
  const params = useLocalSearchParams<{ offering?: string }>();
  const offering = useMemo<DiscoveryOffering | null>(() => {
    try {
      return params.offering ? JSON.parse(params.offering) : null;
    } catch {
      return null;
    }
  }, [params.offering]);

  const client = useQueryClient();
  const profile = useQuery({
    queryKey: ["customer-profile"],
    queryFn: () => api.get<{ customer?: { addresses?: Address[] } }>("/api/customer/profile"),
  });
  const saved = profile.data?.customer?.addresses || [];

  const [requestKey] = useState(() => Crypto.randomUUID());
  const [addr, setAddr] = useState({ addressLine: "", locality: "", city: "", state: "", pincode: "" });
  const [capture, setCapture] = useState<GpsReading | null>(null);
  const [slotIndex, setSlotIndex] = useState(0);
  const [qty, setQty] = useState("1");
  const [description, setDescription] = useState("");
  const [locating, setLocating] = useState(false);
  const [locNote, setLocNote] = useState("");
  const timeSlots = useMemo(slots, []);

  useEffect(() => {
    const first = saved[0];
    if (first && !addr.addressLine) fill(first);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.data]);

  function fill(a: Address) {
    setAddr({
      addressLine: a.addressLine || "",
      locality: a.locality || "",
      city: a.city || "",
      state: a.state || "",
      pincode: a.pincode || "",
    });
  }

  async function pinLocation() {
    setLocating(true);
    setLocNote("");
    try {
      const reading = await currentReading();
      setCapture(reading);
      try {
        const s = await suggestAddress(reading);
        setAddr((a) => ({
          addressLine: a.addressLine || s.addressLine || "",
          locality: s.locality || a.locality,
          city: s.city || a.city,
          state: s.state || a.state,
          pincode: s.pincode || a.pincode,
        }));
        setLocNote("Location pinned. Check the address and add your flat/house number.");
      } catch {
        setLocNote("Location pinned. Address suggestions are unavailable — please type your address.");
      }
    } catch (e) {
      setLocNote(errorText(e));
    } finally {
      setLocating(false);
    }
  }

  const perUnit = offering?.pricing.model === "per_unit";
  const quantity = Math.max(1, Math.min(1000, parseInt(qty, 10) || 1));

  const submit = useMutation({
    mutationFn: () =>
      api.post<{ serviceRequest: { id: string; status: string }; replay?: boolean }>("/api/customer/service-requests", {
        requestKey,
        destinationConfirmed: true,
        serviceOfferingId: offering!.offeringId,
        ...(capture ? { destinationCapture: { ...capture, confirmed: true } } : {}),
        address: {
          addressLine: addr.addressLine.trim(),
          city: addr.city.trim(),
          ...(addr.state.trim() ? { state: addr.state.trim() } : {}),
          ...(addr.locality.trim() ? { locality: addr.locality.trim() } : {}),
          pincode: addr.pincode.trim(),
        },
        ...(timeSlots[slotIndex]?.value ? { preferredDate: timeSlots[slotIndex].value } : {}),
        ...(description.trim() ? { description: description.trim() } : {}),
        quantity: perUnit ? quantity : 1,
      }),
    onSuccess: () => {
      for (const key of ["customer-requests", "customer-bookings"]) client.invalidateQueries({ queryKey: [key] });
      router.replace("/customer/bookings");
    },
  });

  if (!offering) {
    return (
      <Screen>
        <Notice text="This service couldn't be opened. Go back and pick it again." tone="warning" />
      </Screen>
    );
  }

  const ready =
    addr.addressLine.trim().length >= 3 && addr.city.trim().length >= 2 && /^[1-9]\d{5}$/.test(addr.pincode.trim());

  return (
    <Screen>
      <Card>
        <H2>{offering.service.name}</H2>
        <Body muted>{offering.provider.companyName}</Body>
        <KeyValue k="Price" v={priceText(offering.pricing)} />
        {offering.pricing.taxPercent ? <KeyValue k="Tax" v={`${offering.pricing.taxPercent}%`} /> : null}
        {perUnit ? <KeyValue k="Estimated total" v={money(offering.pricing.finalPrice * quantity)} /> : null}
        {offering.service.description ? <Body muted>{offering.service.description}</Body> : null}
      </Card>

      <H2>Service address</H2>
      {saved.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {saved.map((a, i) => (
            <Chip key={i} text={a.label || a.locality || a.city || `Address ${i + 1}`} onPress={() => { fill(a); setCapture(null); }} />
          ))}
        </ScrollView>
      ) : null}
      <Button title={capture ? "Location pinned ✓  (re-pin)" : "Pin my current location"} variant="secondary" loading={locating} onPress={pinLocation} />
      {locNote ? <Notice text={locNote} tone={capture ? "success" : "warning"} /> : null}
      <Field label="House / flat, street" value={addr.addressLine} onChangeText={(v) => setAddr({ ...addr, addressLine: v })} />
      <Field label="Locality / area" value={addr.locality} onChangeText={(v) => setAddr({ ...addr, locality: v })} />
      <Row>
        <View style={{ flex: 1 }}>
          <Field label="City" value={addr.city} onChangeText={(v) => setAddr({ ...addr, city: v })} />
        </View>
        <View style={{ width: 120 }}>
          <Field label="PIN code" value={addr.pincode} onChangeText={(v) => setAddr({ ...addr, pincode: v })} keyboardType="number-pad" maxLength={6} />
        </View>
      </Row>
      <Field label="State" value={addr.state} onChangeText={(v) => setAddr({ ...addr, state: v })} />

      <H2>When?</H2>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {timeSlots.map((s, i) => (
          <Chip key={s.label} text={s.label} active={slotIndex === i} onPress={() => setSlotIndex(i)} />
        ))}
      </View>

      {perUnit ? (
        <Field label={`Quantity (${offering.pricing.unit || "units"})`} value={qty} onChangeText={setQty} keyboardType="number-pad" />
      ) : null}
      <Field label="Describe the problem (optional)" value={description} onChangeText={setDescription} multiline maxLength={2000} />

      {submit.error ? <Notice text={errorText(submit.error)} tone="danger" /> : null}
      <Button title="Send booking request" loading={submit.isPending} disabled={!ready} onPress={() => submit.mutate()} />
      <Body muted>The provider confirms your request and assigns a Pro. Your bill appears under Bills when the job is done.</Body>
    </Screen>
  );
}
