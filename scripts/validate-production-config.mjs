const isProduction = process.env.NODE_ENV === "production" || process.env.BRAIN2_DEPLOY_ENV === "production";

const groups = [
  {
    name: "APP",
    required: ["NEXT_PUBLIC_APP_URL"],
  },
  {
    name: "AUTH",
    required: ["AUTH_PROVIDER", "AUTH_SESSION_SECRET", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
  },
  {
    name: "BILLING",
    required: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_PRO_MONTHLY", "STRIPE_PRICE_PRO_YEARLY", "STRIPE_PRICE_FOUNDER_LIFETIME"],
  },
  {
    name: "MCP",
    required: ["INCONTEXT_MCP_BASE_URL", "INCONTEXT_MCP_SIGNING_SECRET"],
  },
  {
    name: "SYNC",
    required: ["BRAIN2_ICE_SERVERS_JSON"],
  },
];

function present(key) {
  const value = process.env[key];
  return Boolean(value && value.trim() && !/your-|placeholder|changeme|todo/i.test(value));
}

const missing = [];
for (const group of groups) {
  for (const key of group.required) if (!present(key)) missing.push(`${group.name}:${key}`);
  if (group.anyOf && !group.anyOf.some((set) => set.every(present))) {
    missing.push(`${group.name}:one of ${group.anyOf.map((set) => `[${set.join(", ")}]`).join(" or ")}`);
  }
}

if (!isProduction) {
  console.log("Production config validation skipped outside production. Set BRAIN2_DEPLOY_ENV=production to enforce it locally.");
  process.exit(0);
}

if (process.env.LOCAL_DEMO_MODE === "1" || process.env.BILLING_DEMO_MODE === "1") {
  missing.push("SECURITY:demo modes must be disabled in production");
}

if (process.env.AUTH_PROVIDER && process.env.AUTH_PROVIDER !== "supabase") {
  missing.push("AUTH:AUTH_PROVIDER must be supabase");
}

if (missing.length) {
  console.error("Brain2 production config validation failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log("Brain2 production config validation PASS");
