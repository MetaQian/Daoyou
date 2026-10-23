import { apiFetch } from '@app/lib/api/fetch';
import type { DungeonState } from '@daoyou/game-domain/dungeon';
import { useCallback, useEffect, useRef, useState } from 'react';

export function useDungeonState(cultivatorId: string | undefined) {
  const [state, setState] = useState<DungeonState | null>(null);
  const [loading, setLoading] = useState(!!cultivatorId);
  const [error, setError] = useState<string | null>(null);
  // 后端大模型推演中（start/action 的 LLM 尚未返回）：期间禁止重复操作，并自动轮询
  const [generating, setGenerating] = useState(false);
  const sequence = useRef(0);
  const storageKey = `dungeon:last-run:${cultivatorId}`;
  useEffect(() => {
    if (cultivatorId && state?.runId)
      sessionStorage.setItem(storageKey, state.runId);
  }, [cultivatorId, state?.runId, storageKey]);

  const refresh = useCallback(async () => {
    if (!cultivatorId) return;
    const request = ++sequence.current;
    setLoading(true);
    async function read(
      runId?: string,
      attempt = 0,
    ): Promise<{ next: DungeonState | null; generating: boolean } | null> {
      const res = await apiFetch(
        `/api/dungeon/state${runId ? `?runId=${encodeURIComponent(runId)}` : ''}`,
        { signal: AbortSignal.timeout(15000) },
      );
      if ((res.status === 409 || res.status === 429) && attempt < 3) {
        // 后端动作仍在处理（LLM 推演中），短暂等待后自动重试，不直接报错
        await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
        if (request !== sequence.current) return null;
        return read(runId, attempt + 1);
      }
      if (res.status === 409 || res.status === 429)
        throw new Error('探索仍在处理中，请稍后重新读取');
      if (!res.ok) throw new Error('暂时无法读取探索结果，请重新读取');
      const data = await res.json();
      if (data.error || !('state' in data))
        throw new Error('探索状态读取失败，请重新读取');
      return { next: data.state, generating: Boolean(data.generating) };
    }
    try {
      let result = await read();
      const lastRun = sessionStorage.getItem(storageKey);
      if (!result?.next && lastRun)
        result = (await read(lastRun)) ?? result;
      if (request !== sequence.current) return;
      setState(result?.next ?? null);
      setGenerating(result?.generating ?? false);
      setError(null);
    } catch (reason) {
      if (request !== sequence.current) return;
      setError(
        reason instanceof Error && reason.name !== 'SyntaxError'
          ? reason.message
          : '暂时无法读取探索结果，请重新读取',
      );
    } finally {
      if (request === sequence.current) setLoading(false);
    }
  }, [cultivatorId, storageKey]);

  useEffect(() => {
    const timer = setTimeout(() => void refresh(), 0);
    const requests = sequence;
    return () => {
      clearTimeout(timer);
      requests.current++;
    };
  }, [refresh]);

  // 推演中（LLM 未返回）：每 10 秒自动轮询，直到新状态落地（或标记 TTL 过期）
  useEffect(() => {
    if (!generating || error || !cultivatorId) return;
    const timer = setTimeout(() => void refresh(), 10000);
    return () => clearTimeout(timer);
  }, [generating, error, cultivatorId, refresh]);

  return {
    state,
    setState,
    loading,
    error,
    generating,
    refresh,
    dismissSettlement: () => {
      sessionStorage.removeItem(storageKey);
      setState(null);
    },
  };
}
