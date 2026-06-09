import { isAdminEmail } from "@/auth";

export type FeatureFlags = {
  receitas: boolean;
};

export const FEATURE_FLAG_KEYS: ReadonlyArray<keyof FeatureFlags> = ["receitas"];

const ALL_DISABLED: FeatureFlags = {
  receitas: false,
};

export function getFeatureFlags(email: string | null | undefined): FeatureFlags {
  if (!email) return ALL_DISABLED;
  const admin = isAdminEmail(email);
  return {
    receitas: admin,
  };
}

export function isFeatureEnabled(
  flag: keyof FeatureFlags,
  email: string | null | undefined
): boolean {
  return getFeatureFlags(email)[flag];
}
