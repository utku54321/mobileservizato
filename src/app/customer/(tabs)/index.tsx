import React, { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import Ionicons from "@expo/vector-icons/Ionicons";
import { api, errorText, qs } from "@/lib/api";
import { currentReading, suggestAddress } from "@/lib/location";
import { priceText } from "@/lib/pricing";
import type { Address, CatalogCategory, DiscoveryOffering } from "@/lib/types";
import { Body, Button, Card, Chip, colors, Empty, ErrorBox, Field, H2, Loading, Notice, Row, Screen } from "@/components/ui";

export default function Discover() {
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState<{ city: string; pincode: string; q: string; category: string } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState("");

  const catalog = useQuery({
    queryKey: ["catalog"],
    queryFn: () => api.get<{ categories: CatalogCategory[] }>("/api/catalog"),
    staleTime: 5 * 60_000,
  });

  // Start from the customer's saved address, if any.
  const profile = useQuery({
    queryKey: ["customer-profile"],
    queryFn: () => api.get<{ customer?: { addresses?: Address[] } }>("/api/customer/profile"),
  });
  useEffect(() => {
    const saved = profile.data?.customer?.addresses?.[0];
    if (saved && !search) {
      setCity(saved.city || "");
      setPincode(saved.pincode || "");
      if (saved.city || saved.pincode) setSearch({ city: saved.city || "", pincode: saved.pincode || "", q: "", category: "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.data]);

  const results = useQuery({
    queryKey: ["discovery", search],
    enabled: Boolean(search && (search.city || search.pincode)),
    queryFn: ({ signal }) =>
      api.get<{ providers: DiscoveryOffering[]; hasMore: boolean }>(
        `/api/customer/discovery${qs({ city: search!.city, pincode: search!.pincode, q: search!.q, category: search!.category, limit: 30 })}`,
        signal,
      ),
  });

  async function useMyLocation() {
    setLocating(true);
    setLocError("");
    try {
      const address = await suggestAddress(await currentReading());
      setCity(address.city || "");
      setPincode(address.pincode || "");
      setSearch({ city: address.city || "", pincode: address.pincode || "", q, category });
    } catch (e) {
      setLocError(errorText(e));
    } finally {
      setLocating(false);
    }
  }

  const runSearch = (overrides: Partial<{ category: string }> = {}) =>
    setSearch({ city: city.trim(), pincode: pincode.trim(), q: q.trim(), category, ...overrides });

  return (
    <Screen refreshing={results.isRefetching} onRefresh={results.refetch}>
      <H2>What do you need help with?</H2>
      <Field label="Search" value={q} onChangeText={setQ} placeholder="e.g. AC service, tap repair" returnKeyType="search" onSubmitEditing={() => runSearch()} />
      <Row>
        <View style={{ flex: 1 }}>
          <Field label="City" value={city} onChangeText={setCity} placeholder="Patna" />
        </View>
        <View style={{ width: 120 }}>
          <Field label="PIN code" value={pincode} onChangeText={setPincode} keyboardType="number-pad" maxLength={6} placeholder="800001" />
        </View>
      </Row>
      <Row>
        <Button title="Search" style={{ flex: 1 }} disabled={!city.trim() && pincode.trim().length !== 6} onPress={() => runSearch()} />
        <Button title="Use my location" variant="secondary" loading={locating} onPress={useMyLocation} />
      </Row>
      {locError ? <Notice text={locError} tone="warning" /> : null}

      {catalog.data?.categories?.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
          <Chip text="All" active={!category} onPress={() => { setCategory(""); if (search) runSearch({ category: "" }); }} />
          {catalog.data.categories.filter((c) => c.isActive).map((c) => (
            <Chip key={c.key} text={c.label} active={category === c.key}
              onPress={() => { setCategory(c.key); if (search) runSearch({ category: c.key }); }} />
          ))}
        </ScrollView>
      ) : null}

      {!search ? <Empty title="Find services near you" text="Enter your city or PIN code, or use your location." /> : null}
      {results.isLoading ? <Loading text="Finding providers…" /> : null}
      <ErrorBox error={results.error} onRetry={results.refetch} />
      {results.data && results.data.providers.length === 0 ? (
        <Empty title="No services found here yet" text="Try a nearby city, another PIN code, or a different search." />
      ) : null}

      {results.data?.providers.map((o) => (
        <Card key={o.offeringId} onPress={() => router.push({ pathname: "/customer/book", params: { offering: JSON.stringify(o) } })}>
          <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: colors.text }}>{o.service.name}</Text>
              <Body muted>{o.provider.companyName}</Body>
            </View>
            <Text style={{ fontWeight: "700", color: colors.text }}>{priceText({ ...o.pricing, finalPrice: o.pricing.finalPrice })}</Text>
          </Row>
          <Row>
            {o.rating ? (
              <Row style={{ gap: 3 }}>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Body>{o.rating.toFixed(1)} ({o.reviewCount})</Body>
              </Row>
            ) : (
              <Body muted>New</Body>
            )}
            {o.pricing.offerActive && o.pricing.offerName ? <Body style={{ color: colors.success }}>· {o.pricing.offerName}</Body> : null}
            {o.discoveryCoverage === "uncertain" ? <Body muted>· Provider confirms area</Body> : null}
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
