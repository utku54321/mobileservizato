import React, { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, View } from "react-native";
import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { useAuth } from "@/lib/auth";
import { API_URL, VARIANT } from "@/lib/config";
import { errorText } from "@/lib/api";
import { normalizePhone } from "@/lib/format";
import { Body, Button, Chip, colors, Field, H1, Notice, Row, Screen } from "@/components/ui";

const TITLES = {
  customer: { title: "Servizato", sub: "Book trusted home services near you." },
  partner: { title: "Servizato Partner", sub: "For service providers and Pros." },
  ops: { title: "Servizato Ops", sub: "For Servizato admins and dispatchers." },
};

export default function SignIn() {
  const { signInWithPassword, sendOtp, signInWithOtp } = useAuth();
  // Phone OTP creates a *customer* account for unknown numbers, so staff use email only.
  const otpAllowed = VARIANT !== "ops";
  const [mode, setMode] = useState<"password" | "otp">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function run(task: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    setInfo("");
    try {
      await task();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const t = TITLES[VARIANT];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Screen>
          <View style={{ alignItems: "center", marginTop: 32, marginBottom: 16, gap: 8 }}>
            <Image source={require("../../assets/logo.png")} style={{ width: 72, height: 72 }} resizeMode="contain" />
            <H1>{t.title}</H1>
            <Body muted>{t.sub}</Body>
          </View>

          {otpAllowed ? (
            <Row style={{ justifyContent: "center" }}>
              <Chip text="Email & password" active={mode === "password"} onPress={() => setMode("password")} />
              <Chip text="Phone OTP" active={mode === "otp"} onPress={() => setMode("otp")} />
            </Row>
          ) : null}

          {mode === "password" ? (
            <>
              <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="you@example.com" />
              <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" placeholder="Your password" />
              <Button title="Sign in" loading={busy} disabled={!email || !password} onPress={() => run(() => signInWithPassword(email, password))} />
            </>
          ) : (
            <>
              <Field label="Mobile number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="98765 43210" />
              {otpSent ? (
                <Field label="OTP" value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6} placeholder="6-digit code" />
              ) : null}
              {!otpSent ? (
                <Button
                  title="Send OTP"
                  loading={busy}
                  disabled={phone.replace(/\D/g, "").length < 10}
                  onPress={() =>
                    run(async () => {
                      await sendOtp(normalizePhone(phone));
                      setOtpSent(true);
                      setInfo("We sent a code by SMS.");
                    })
                  }
                />
              ) : (
                <>
                  <Button title="Verify & sign in" loading={busy} disabled={otp.length < 4} onPress={() => run(() => signInWithOtp(normalizePhone(phone), otp))} />
                  <Button title="Change number" variant="ghost" onPress={() => { setOtpSent(false); setOtp(""); }} />
                </>
              )}
              {VARIANT === "partner" ? (
                <Body muted>Pros: use the number your provider registered for you.</Body>
              ) : null}
            </>
          )}

          {info ? <Notice text={info} tone="success" /> : null}
          {error ? <Notice text={error} tone="danger" /> : null}

          {VARIANT !== "ops" ? (
            <Link href="/sign-up" asChild>
              <Button title={VARIANT === "partner" ? "Register your business" : "Create an account"} variant="secondary" />
            </Link>
          ) : null}
          <Button title="Trouble signing in? Contact support" variant="ghost" onPress={() => WebBrowser.openBrowserAsync(`${API_URL}/contact`)} />
        </Screen>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
