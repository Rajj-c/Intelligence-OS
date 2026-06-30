import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { supabase } from "@/integrations/supabase/client";

import { useServerFn } from "@tanstack/react-start";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token
    ? { authorization: `Bearer ${session.access_token}` }
    : {};
}

export function useAuthServerFn<TExecutor extends (...args: any[]) => any>(
  serverFn: TExecutor
) {
  const fn = useServerFn(serverFn);
  return (async (payload?: any) => {
    const headers = await getAuthHeaders();
    return (fn as any)({
      ...payload,
      headers: {
        ...payload?.headers,
        ...headers,
      },
    });
  }) as unknown as typeof fn;
}
