import React, { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, errorText } from "@/lib/api";
import { label } from "@/lib/format";
import { Button, Chip, Field, H2, Notice, Screen } from "@/components/ui";

const SOURCES = ["call", "whatsapp", "walkin", "referral", "ads", "website"] as const;

export default function NewLead() {
  const client = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [service, setService] = useState("");
  const [source, setSource] = useState<(typeof SOURCES)[number]>("call");
  const [remarks, setRemarks] = useState("");
  const create = useMutation({
    mutationFn: () =>
      api.post("/api/leads", {
        ...(name.trim() ? { name: name.trim() } : {}),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(email.trim() ? { email: email.trim() } : {}),
        serviceRequested: service.trim(),
        source,
        ...(remarks.trim() ? { remarks: remarks.trim() } : {}),
      }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["staff-leads"] });
      router.back();
    },
  });
  return (
    <Screen>
      <Field label="Customer name" value={name} onChangeText={setName} />
      <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Field label="Service requested" value={service} onChangeText={setService} placeholder="e.g. AC not cooling" />
      <H2>Source</H2>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {SOURCES.map((s) => <Chip key={s} text={label(s)} active={source === s} onPress={() => setSource(s)} />)}
      </View>
      <Field label="Remarks" value={remarks} onChangeText={setRemarks} multiline />
      {create.error ? <Notice text={errorText(create.error)} tone="danger" /> : null}
      <Button title="Save lead" loading={create.isPending} disabled={!service.trim() || (!phone.trim() && !email.trim())} onPress={() => create.mutate()} />
    </Screen>
  );
}
