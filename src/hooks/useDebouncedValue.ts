import { useCallback, useEffect, useState } from 'react'

/**
 * `value`, updated only after it stops changing for `delayMs`. `flush()`
 * applies the latest value immediately (e.g. on Enter).
 */
export function useDebouncedValue<T>(value: T, delayMs: number): [T, () => void] {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(t)
  }, [value, delayMs])
  const flush = useCallback(() => setDebounced(value), [value])
  return [debounced, flush]
}
