import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

// Tells the browser whether the server is serving fixtures, so the mock
// banner reflects how the server is running now, not how it was built.
export function GET() {
  return Response.json(
    { mockAi: env.MOCK_AI },
    { headers: { "Cache-Control": "no-store" } },
  );
}
