import { Brain2TrustPage } from "@/features/brain2/Brain2TrustPage";

export const metadata = {
  title: "Security",
  description: "Security model and production blockers for brain2:inContext.",
};

export default function Page() {
  return <Brain2TrustPage kind="security" />;
}
