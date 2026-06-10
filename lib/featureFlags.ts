import { isAdminEmail } from "@/auth";
import { getUserFlags } from "@/lib/db";

export type FeatureFlags = {
  receitas: boolean;
};

export const FEATURE_FLAG_KEYS: ReadonlyArray<keyof FeatureFlags> = ["receitas"];

const ALL_DISABLED: FeatureFlags = {
  receitas: false,
};

export async function getFeatureFlags(
  email: string | null | undefined,
  userId: number | null | undefined
): Promise<FeatureFlags> {
  if (!email) return ALL_DISABLED;
  if (isAdminEmail(email)) return { receitas: true };
  if (!userId) return ALL_DISABLED;
  const dbFlags = await getUserFlags(userId);
  return {
    receitas: !!dbFlags.receitas,
  };
}

export async function isFeatureEnabled(
  flag: keyof FeatureFlags,
  email: string | null | undefined,
  userId: number | null | undefined
): Promise<boolean> {
  const flags = await getFeatureFlags(email, userId);
  return flags[flag];
}
