import React, { useState } from "react";
import { Share, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import { api, errorText } from "@/lib/api";
import { dateTime, normalizePhone } from "@/lib/format";
import { Body, Button, Card, Chip, colors, Field, H2, Notice, Screen } from "@/components/ui";

interface Created {
  duplicate?: boolean;
  credentialUnavailable?: boolean;
  temporaryPassword?: string;
  loginEmail?: string;
  credentialExpiresAt?: string;
}

export default function AddPro() {
  const client = useQueryClient();
  const catalog = useQuery({
    queryKey: ["catalog"],
    queryFn: () => api.get<{ skills: { key: string; label: string; isActive: boolean }[] }>("/api/catalog"),
    staleTime: 5 * 60_000,
  });
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [creationKey] = useState(() => Crypto.randomUUID());

  const create = useMutation({
    mutationFn: () =>
      api.post<Created>("/api/service-provider/technicians", {
        name: name.trim(),
        phone: normalizePhone(phone),
        email: email.trim(),
        skillKeys: skills,
        creationKey,
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["provider-technicians"] }),
  });

  const result = create.data;
  if (result) {
    if (result.duplicate || !result.temporaryPassword) {
      return (
        <Screen>
          <Notice text="This Pro already exists. Their login details weren't changed." tone="warning" />
        </Screen>
      );
    }
    const message = `Your Servizato Partner login\nEmail: ${result.loginEmail}\nTemporary password: ${result.temporaryPassword}\nInstall "Servizato Partner" from the Play Store, sign in, and set your own password.`;
    return (
      <Screen>
        <H2>Pro added</H2>
        <Card>
          <Body muted>Login email</Body>
          <Text selectable style={{ fontSize: 16, fontWeight: "600", color: colors.text }}>{result.loginEmail}</Text>
          <Body muted>Temporary password</Body>
          <Text selectable style={{ fontSize: 16, fontWeight: "600", color: colors.text, fontFamily: "monospace" }}>{result.temporaryPassword}</Text>
          {result.credentialExpiresAt ? <Body muted>Expires {dateTime(result.credentialExpiresAt)}</Body> : null}
        </Card>
        <Notice text="This password is shown only once. Share it privately with your Pro." tone="warning" />
        <Button title="Share with Pro" onPress={() => Share.share({ message })} />
      </Screen>
    );
  }

  const ready = name.trim().length >= 2 && phone.replace(/\D/g, "").length >= 10 && skills.length > 0;
  return (
    <Screen>
      <Field label="Name" value={name} onChangeText={setName} />
      <Field label="Mobile number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Field label="Email (optional)" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <H2>Skills</H2>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {(catalog.data?.skills || []).filter((s) => s.isActive).map((s) => (
          <Chip key={s.key} text={s.label} active={skills.includes(s.key)}
            onPress={() => setSkills((list) => (list.includes(s.key) ? list.filter((k) => k !== s.key) : [...list, s.key]))} />
        ))}
      </View>
      {create.error ? <Notice text={errorText(create.error)} tone="danger" /> : null}
      <Button title="Create Pro account" loading={create.isPending} disabled={!ready} onPress={() => create.mutate()} />
    </Screen>
  );
}
