'use client';

import React, { useState, useEffect } from 'react';
import { Smartphone, Share, PlusSquare, X, Bell } from 'lucide-react';

export const IosInstallPrompt: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Проверка, что запущено на iOS в Safari и еще не установлено как PWA
    const isIos =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone =
      (window.navigator as any).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;
    const isDismissed = localStorage.getItem('ios_install_dismissed_v1');

    if (isIos && !isStandalone && !isDismissed) {
      // Показываем через 3 секунды после входа
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('ios_install_dismissed_v1', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="md:hidden fixed bottom-16 left-3 right-3 z-50 p-4 rounded-xl bg-zinc-950/95 border border-zinc-700 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-100 shrink-0">
            <Smartphone className="w-5 h-5 text-zinc-300" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-zinc-100">
              Установите дневник на iPhone
            </h4>
            <p className="text-[11px] text-zinc-400">
              Быстрый вход без браузера и мгновенные уведомления
            </p>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="p-1 rounded text-zinc-500 hover:text-zinc-300"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 pt-2.5 border-t border-surface-border text-xs text-zinc-300 space-y-1.5 font-sans">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-zinc-800 text-[11px] font-bold flex items-center justify-center shrink-0">
            1
          </span>
          <span className="flex items-center gap-1">
            Нажмите кнопку <Share className="w-3.5 h-3.5 text-zinc-300 inline" /> «Поделиться» внизу Safari
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-zinc-800 text-[11px] font-bold flex items-center justify-center shrink-0">
            2
          </span>
          <span className="flex items-center gap-1">
            Выберите <PlusSquare className="w-3.5 h-3.5 text-zinc-300 inline" /> «На экран "Домой"»
          </span>
        </div>
      </div>
    </div>
  );
};
