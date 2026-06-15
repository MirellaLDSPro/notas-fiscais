import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDictionary } from "@/lib/dictionaries";
import LandingPage from "./LandingPage";

const dict = getDictionary("pt");

export const metadata: Metadata = {
  title: dict.meta.title,
  description: dict.meta.description,
  alternates: {
    canonical: "/",
    languages: {
      "pt-BR": "/",
      en: "/en",
    },
  },
};

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return <LandingPage dict={dict} locale="pt" />;
}
