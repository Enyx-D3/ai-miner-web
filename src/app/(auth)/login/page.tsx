"use client";
import SignInScreen from "@/legacy/refinery/screens/SignInScreen";
import { useRefineryNavigation } from "@/hooks/useRefineryNavigation";
export default function Page(){ const navigate=useRefineryNavigation(); return <SignInScreen onNavigate={navigate}/>; }
