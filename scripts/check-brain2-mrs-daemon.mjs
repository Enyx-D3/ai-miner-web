import process from "node:process";

const host = process.env.BRAIN2_MRS_HOST || "127.0.0.1";
const port = process.env.BRAIN2_MRS_PORT || "4317";
const targetUrl = `http://${host}:${port}/health`;

try {
  const response = await fetch(targetUrl);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    process.stderr.write(`${targetUrl} responded with ${response.status}\n`);
    process.exit(1);
  }
  process.stdout.write(JSON.stringify(body, null, 2) + "\n");
  process.exit(0);
} catch (error) {
  process.stderr.write(`${targetUrl} is unreachable: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
