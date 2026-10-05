import { Brain2TrustPage } from "@/features/brain2/Brain2TrustPage";

export const metadata = {
  title: "Privacy",
  description: "How brain2:inContext handles local memory, exports, sync, provider context, and deletion boundaries.",
};

export default function Page() {
  return <Brain2TrustPage kind="privacy" />;
}
