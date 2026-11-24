import React from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth";
import { APP_FOR_ROLE, type Role } from "@/lib/config";
import { label } from "@/lib/format";
import { Body, Button, colors, H1 } from "@/components/ui";

export default function WrongApp() {
  const { user, signOut } = useAuth();
  const target = APP_FOR_ROLE[user?.role as Role];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, padding: 24, justifyContent: "center", gap: 14 }}>
        <H1>This account uses a different app</H1>
        <Body>
          You're signed in as {user?.email || user?.phone} ({label(user?.role)}).
          {target ? ` Please install "${target}" from the Play Store to continue.` : " This account has no app role yet."}
        </Body>
        <Button title="Sign out" onPress={signOut} />
      </View>
    </SafeAreaView>
  );
}
