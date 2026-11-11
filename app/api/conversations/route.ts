import { getConversations } from "@/lib/memory/reader";
import { createServerClient } from "@/lib/supabase/client";

export async function GET(req: Request): Promise<Response> {
  const sessionId = req.headers.get("x-session-id");
  if (!sessionId) {
    return Response.json({ error: "Missing x-session-id header" }, { status: 400 });
  }

  try {
    const conversations = await getConversations(sessionId);
    return Response.json(conversations);
  } catch (err) {
    console.error("[conversations] GET error:", err);
    return Response.json({ error: "Failed to load conversations" }, { status: 500 });
  }
}

export async function POST(req: Request): Promise<Response> {
  const sessionId = req.headers.get("x-session-id");
  if (!sessionId) {
    return Response.json({ error: "Missing x-session-id header" }, { status: 400 });
  }

  let title: string | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    title = body.title;
  } catch {
    // title is optional — no body is fine
  }

  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("conversations")
      .insert({
        user_session_id: sessionId,
        title: title ?? null,
      })
      .select("id, title, created_at, updated_at")
      .single();

    if (error) throw new Error(error.message);

    return Response.json(data, { status: 201 });
  } catch (err) {
    console.error("[conversations] POST error:", err);
    return Response.json({ error: "Failed to create conversation" }, { status: 500 });
  }
}
