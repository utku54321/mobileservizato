import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import { VARIANT } from "@/lib/config";
import { api, errorText } from "@/lib/api";
import { normalizePhone } from "@/lib/format";
import { Body, Button, Field, H2, Notice, Screen } from "@/components/ui";

/** Customer app: customer account. Partner app: service-provider (business) account. */
export default function SignUp() {
  const { signInWithPassword } = useAuth();
  const provider = VARIANT === "partner";
  const [f, setF] = useState({
    name: "",
    companyName: "",
    email: "",
    phone: "",
    password: "",
    businessType: "",
    city: "",
    state: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  async function submit() {
    setBusy(true);
    setError("");
    try {
      if (provider) {
        await api.post("/api/auth/signup/provider", {
          ownerName: f.name,
          companyName: f.companyName,
          email: f.email,
          phone: normalizePhone(f.phone),
          password: f.password,
          businessType: f.businessType,
          city: f.city,
          state: f.state,
        });
      } else {
        await api.post("/api/auth/signup/customer", {
          name: f.name,
          email: f.email,
          phone: normalizePhone(f.phone),
          password: f.password,
        });
      }
      await signInWithPassword(f.email, f.password);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const ready =
    f.name.trim().length >= 2 &&
    /\S+@\S+\.\S+/.test(f.email) &&
    f.phone.replace(/\D/g, "").length >= 10 &&
    f.password.length >= 6 &&
    (!provider || f.companyName.trim().length >= 2);

  return (
    <Screen>
      <H2>{provider ? "Register your service business" : "Create your Servizato account"}</H2>
      {provider ? (
        <Body muted>
          After registering, complete onboarding and submit your business for verification. Pros (technicians) don't
          register here — their provider adds them and shares their login.
        </Body>
      ) : null}
      <Field label={provider ? "Owner name" : "Full name"} value={f.name} onChangeText={set("name")} autoComplete="name" />
      {provider ? <Field label="Business name" value={f.companyName} onChangeText={set("companyName")} /> : null}
      <Field label="Email" value={f.email} onChangeText={set("email")} autoCapitalize="none" keyboardType="email-address" />
      <Field label="Mobile number" value={f.phone} onChangeText={set("phone")} keyboardType="phone-pad" placeholder="98765 43210" />
      <Field label="Password" value={f.password} onChangeText={set("password")} secureTextEntry placeholder="At least 6 characters" />
      {provider ? (
        <>
          <Field label="Business type" value={f.businessType} onChangeText={set("businessType")} placeholder="e.g. Plumbing, AC repair" />
          <Field label="City" value={f.city} onChangeText={set("city")} />
          <Field label="State" value={f.state} onChangeText={set("state")} />
        </>
      ) : null}
      {error ? <Notice text={error} tone="danger" /> : null}
      <Button title="Create account" loading={busy} disabled={!ready} onPress={submit} />
      <Body muted>By continuing you agree to Servizato's Terms and Privacy Policy.</Body>
    </Screen>
  );
}
