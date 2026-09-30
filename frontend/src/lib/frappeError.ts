import toast from 'react-hot-toast';

// ERPNext returns errors in several shapes. This helper normalises them.
export function parseFrappeError(err: unknown): string {
  if (!err) return 'An unknown error occurred';

  // axios-style response
  const e = err as Record<string, unknown>;

  // Check _server_messages first (JSON string array of {message:...})
  const serverMsgs =
    (e?.['_server_messages'] as string | undefined) ||
    ((e as { response?: { data?: { _server_messages?: string } } })?.response?.data
      ?._server_messages as string | undefined);

  if (serverMsgs) {
    try {
      const msgs: Array<{ message: string }> = JSON.parse(serverMsgs);
      return msgs.map((m) => m.message).join('\n');
    } catch {
      return serverMsgs;
    }
  }

  // Standard exception message
  const exc =
    (e?.['exception'] as string | undefined) ||
    ((e as { response?: { data?: { exception?: string } } })?.response?.data
      ?.exception as string | undefined);
  if (exc) return exc;

  const msg =
    (e?.['message'] as string | undefined) ||
    ((e as { response?: { data?: { message?: string } } })?.response?.data
      ?.message as string | undefined);
  if (msg) return msg;

  return String(err);
}

export function showFrappeError(err: unknown) {
  const msg = parseFrappeError(err);
  toast.error(msg, { duration: 6000 });
}
