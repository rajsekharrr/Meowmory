"use client";

import { useState, useEffect } from "react";
import { getOrCreateSessionId } from "@/lib/utils/session";

export function useSession() {
  const [sessionId, setSessionId] = useState<string>("");

  useEffect(() => {
    // getOrCreateSessionId touches localStorage — client-only
    setSessionId(getOrCreateSessionId());
  }, []);

  return { sessionId };
}
