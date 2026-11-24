import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, errorText } from "@/lib/api";
import type { Address } from "@/lib/types";
import { Body, Button, Card, Field, H2, Notice, Row, Screen } from "@/components/ui";

type Editable = { label: string; addressLine: string; locality: string; city: string; state: string; pincode: string };
const blank: Editable = { label: "", addressLine: "", locality: "", city: "", state: "", pincode: "" };

export default function Profile() {
  const client = useQueryClient();
  const q = useQuery({
    queryKey: ["customer-profile"],
    queryFn: () => api.get<{ customer?: { name?: string; email?: string; phone?: string; addresses?: Address[] } }>("/api/customer/profile"),
  });
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [addresses, setAddresses] = useState<Editable[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const c = q.data?.customer;
    if (!c) return;
    setName(c.name || "");
    setPhone(c.phone || "");
    setAddresses(
      (c.addresses || []).map((a) => ({
        label: a.label || "",
        addressLine: a.addressLine || "",
        locality: a.locality || "",
        city: a.city || "",
        state: a.state || "",
        pincode: a.pincode || "",
      })),
    );
  }, [q.data]);

  const save = useMutation({
    mutationFn: () =>
      api.put("/api/customer/profile", {
        name: name.trim(),
        phone: phone.trim(),
        addresses: addresses
          .filter((a) => a.addressLine.trim() && a.city.trim() && a.pincode.trim())
          .map((a) => ({
            ...(a.label.trim() ? { label: a.label.trim() } : {}),
            addressLine: a.addressLine.trim(),
            city: a.city.trim(),
            ...(a.state.trim() ? { state: a.state.trim() } : {}),
            ...(a.locality.trim() ? { locality: a.locality.trim() } : {}),
            pincode: a.pincode.trim(),
          })),
      }),
    onSuccess: () => {
      setSaved(true);
      client.invalidateQueries({ queryKey: ["customer-profile"] });
    },
  });

  const update = (i: number, k: keyof Editable) => (v: string) => {
    setSaved(false);
    setAddresses((list) => list.map((a, j) => (j === i ? { ...a, [k]: v } : a)));
  };

  return (
    <Screen>
      <Field label="Name" value={name} onChangeText={(v) => { setName(v); setSaved(false); }} />
      <Field label="Phone" value={phone} onChangeText={(v) => { setPhone(v); setSaved(false); }} keyboardType="phone-pad" />
      <H2>Saved addresses</H2>
      {addresses.length === 0 ? <Body muted>No saved addresses yet.</Body> : null}
      {addresses.map((a, i) => (
        <Card key={i}>
          <Field label="Label" value={a.label} onChangeText={update(i, "label")} placeholder="Home, Office…" />
          <Field label="House / flat, street" value={a.addressLine} onChangeText={update(i, "addressLine")} />
          <Field label="Locality" value={a.locality} onChangeText={update(i, "locality")} />
          <Row>
            <View style={{ flex: 1 }}>
              <Field label="City" value={a.city} onChangeText={update(i, "city")} />
            </View>
            <View style={{ width: 110 }}>
              <Field label="PIN" value={a.pincode} onChangeText={update(i, "pincode")} keyboardType="number-pad" maxLength={6} />
            </View>
          </Row>
          <Field label="State" value={a.state} onChangeText={update(i, "state")} />
          <Button title="Remove" variant="ghost" onPress={() => setAddresses((l) => l.filter((_, j) => j !== i))} />
        </Card>
      ))}
      {addresses.length < 10 ? (
        <Button title="Add address" variant="secondary" onPress={() => setAddresses((l) => [...l, { ...blank }])} />
      ) : null}
      {save.error ? <Notice text={errorText(save.error)} tone="danger" /> : null}
      {saved ? <Notice text="Saved." tone="success" /> : null}
      <Button title="Save" loading={save.isPending} onPress={() => save.mutate()} />
    </Screen>
  );
}
