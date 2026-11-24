import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, errorText } from "@/lib/api";
import { Body, Button, Field, H2, Notice, Screen } from "@/components/ui";

/** Pros created by a provider sign in with a temporary password and must replace it. */
export default function ChangePassword() {
  const { signOut } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true);
    setError("");
    try {
      await api.post("/api/auth/change-password", { currentPassword: current, newPassword: next });
      // The server rotates the credential, so the old session ends. Sign in again.
      await signOut();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const mismatch = confirm.length > 0 && confirm !== next;
  return (
    <Screen>
      <H2>Choose your own password</H2>
      <Body muted>You signed in with a temporary password. Set a new one (at least 12 characters), then sign in again.</Body>
      <Field label="Temporary password" value={current} onChangeText={setCurrent} secureTextEntry />
      <Field label="New password" value={next} onChangeText={setNext} secureTextEntry />
      <Field label="Confirm new password" value={confirm} onChangeText={setConfirm} secureTextEntry error={mismatch ? "Passwords don't match" : undefined} />
      {error ? <Notice text={error} tone="danger" /> : null}
      <Button title="Save password" loading={busy} disabled={!current || next.length < 12 || next !== confirm} onPress={submit} />
      <Button title="Sign out" variant="ghost" onPress={signOut} />
    </Screen>
  );
}
