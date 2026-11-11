"use client";

import { useEffect, useSyncExternalStore, useTransition } from "react";

const listeners = new Set<() => void>();
let pendingActions = 0;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function updatePendingActions(change: number) {
  pendingActions += change;
  listeners.forEach((listener) => listener());
}

export function useActionProgress(pending: boolean) {
  useEffect(() => {
    if (!pending) return;

    updatePendingActions(1);
    return () => updatePendingActions(-1);
  }, [pending]);
}

export function useProgressTransition() {
  const transition = useTransition();
  useActionProgress(transition[0]);
  return transition;
}

export function ActionProgress() {
  const pending = useSyncExternalStore(
    subscribe,
    () => pendingActions > 0,
    () => false,
  );

  if (!pending) return null;

  return (
    <div className="action-progress" role="progressbar" aria-label="Sedang memproses">
      <div aria-hidden="true" />
    </div>
  );
}
