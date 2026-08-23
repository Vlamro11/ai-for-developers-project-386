import { useEffect, useState } from 'react';
import { IconBan, IconCheck } from './icons';

type ToastKind = 'ok' | 'warn';
interface ToastItem {
  id: number;
  msg: string;
  kind: ToastKind;
}

let pushFn: ((t: ToastItem) => void) | null = null;

export function toast(msg: string, kind: ToastKind = 'ok') {
  pushFn?.({ id: Date.now() + Math.random(), msg, kind });
}

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    pushFn = (t) => {
      setItems((s) => [...s.slice(-3), t]);
      window.setTimeout(() => {
        setItems((s) => s.filter((x) => x.id !== t.id));
      }, 3800);
    };
    return () => {
      pushFn = null;
    };
  }, []);

  return (
    <div className="fixed bottom-4 left-4 z-[70] flex flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          role="status"
          className="anim-toast flex items-center gap-2.5 rounded-lg border border-white/10 bg-pine-deep py-2.5 pl-3 pr-4 text-paper shadow-xl"
        >
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
              t.kind === 'ok' ? 'bg-lime text-pine-deep' : 'bg-rust text-paper'
            }`}
          >
            {t.kind === 'ok' ? <IconCheck className="h-3.5 w-3.5" /> : <IconBan className="h-3.5 w-3.5" />}
          </span>
          <p className="text-sm font-medium">{t.msg}</p>
        </div>
      ))}
    </div>
  );
}
