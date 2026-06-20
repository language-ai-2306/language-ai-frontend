/** useChat — sends a message to the backend and tracks request state. */
import { useCallback, useState } from 'react';

import { ApiError, sendChat } from '../api/client';
import type { ChatResponse } from '../types';

export interface UseChat {
  send: (message: string) => Promise<ChatResponse | null>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export function useChat(): UseChat {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(async (message: string): Promise<ChatResponse | null> => {
    setIsLoading(true);
    setError(null);
    try {
      return await sendChat(message);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { send, isLoading, error, clearError };
}
