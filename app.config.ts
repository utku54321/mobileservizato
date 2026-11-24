import type { ExpoConfig } from "expo/config";

/**
 * One codebase, three Play Store apps.
 * Pick the app with APP_VARIANT=customer | partner | ops (see eas.json).
 */
type Variant = "customer" | "partner" | "ops";

const VARIANTS: Record<
  Variant,
  { name: string; package: string; scheme: string; color: string; iconBg: string }
> = {
  customer: {
    name: "Servizato",
    package: "in.servizato.customer",
    scheme: "servizato",
    color: "#DD1D4A",
    iconBg: "#FFFFFF",
  },
  partner: {
    name: "Servizato Partner",
    package: "in.servizato.partner",
    scheme: "servizato-partner",
    color: "#DD1D4A",
    iconBg: "#1E293B",
  },
  ops: {
    name: "Servizato Ops",
    package: "in.servizato.ops",
    scheme: "servizato-ops",
    color: "#DD1D4A",
    iconBg: "#DD1D4A",
  },
};

/**
 * One Expo (EAS) project builds all three apps. After running `npx eas-cli init`
 * once, paste the project ID it prints here.
 */
const EAS_PROJECT_ID = "";
const EAS_SLUG = "servizato-mobile";

const variant = (process.env.APP_VARIANT || "customer") as Variant;
if (!VARIANTS[variant]) {
  throw new Error(`Unknown APP_VARIANT "${variant}". Use customer, partner or ops.`);
}
const v = VARIANTS[variant];

// Production backend. Override for testing: API_URL=https://staging.servizato.in
const apiUrl = (process.env.API_URL || "https://servizato.in").replace(/\/$/, "");

const androidPermissions: string[] = ["INTERNET"];
if (variant === "customer") {
  androidPermissions.push("ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION");
}
if (variant === "partner") {
  androidPermissions.push(
    "ACCESS_COARSE_LOCATION",
    "ACCESS_FINE_LOCATION",
    "CAMERA",
  );
}

const config: ExpoConfig = {
  name: v.name,
  slug: EAS_SLUG,
  scheme: v.scheme,
  version: "1.0.0",
  orientation: "portrait",
  icon: `./assets/icon-${variant}.png`,
  userInterfaceStyle: "light",
  android: {
    package: v.package,
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: v.iconBg,
      foregroundImage: `./assets/adaptive-${variant}.png`,
    },
    permissions: androidPermissions,
    blockedPermissions: [
      // Foreground-only location in v1: avoids Play's background-location review.
      "android.permission.ACCESS_BACKGROUND_LOCATION",
      "android.permission.RECORD_AUDIO",
      "android.permission.SYSTEM_ALERT_WINDOW",
      ...(variant === "ops" ? ["android.permission.ACCESS_COARSE_LOCATION", "android.permission.ACCESS_FINE_LOCATION"] : []),
      ...(variant !== "partner" ? ["android.permission.CAMERA"] : []),
    ],
  },
  ios: {
    bundleIdentifier: v.package,
  },
  plugins: [
    "expo-router",
    "expo-web-browser",
    ...(variant !== "ops"
      ? [
          [
            "expo-location",
            {
              locationWhenInUsePermission:
                variant === "partner"
                  ? "Servizato Partner shares your location with the customer while you travel to an active job."
                  : "Servizato uses your location to confirm the service address.",
            },
          ] as [string, Record<string, unknown>],
        ]
      : []),
    ...(variant === "partner"
      ? [
          [
            "expo-image-picker",
            {
              cameraPermission: "Take photos of completed work as job proof.",
              photosPermission: "Attach photos of completed work as job proof.",
              microphonePermission: false,
            },
          ] as [string, Record<string, unknown>],
        ]
      : []),
  ],
  experiments: { typedRoutes: false },
  extra: {
    variant,
    apiUrl,
    brandColor: v.color,
    ...(EAS_PROJECT_ID ? { eas: { projectId: EAS_PROJECT_ID } } : {}),
  },
};

export default config;
