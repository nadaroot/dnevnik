'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Sidebar, NavTab } from '@/components/Navigation/Sidebar';
import { BottomNav } from '@/components/Navigation/BottomNav';
import { GpaCard } from '@/components/Dashboard/GpaCard';
import { QuarterCountdown } from '@/components/Dashboard/QuarterCountdown';
import { LessonStatusWidget } from '@/components/Dashboard/LessonStatusWidget';
import { PerformanceChart } from '@/components/Dashboard/PerformanceChart';
import { CriticalSubjects } from '@/components/Dashboard/CriticalSubjects';
import { GradesAnalytics } from '@/components/Dashboard/GradesAnalytics';
import { AveragesTable } from '@/components/Averages/AveragesTable';
import { SubjectList } from '@/components/Subjects/SubjectList';
import { WeekSchedule } from '@/components/Schedule/WeekSchedule';
import { AccountSettings } from '@/components/Settings/AccountSettings';
import { AdminPanel } from '@/components/Admin/AdminPanel';
import { AccountManager } from '@/components/Accounts/AccountManager';
import { TargetModal } from '@/components/Subjects/TargetModal';
import { GoalsTargetTab } from '@/components/Goals/GoalsTargetTab';
import { IosInstallPrompt } from '@/components/PWA/IosInstallPrompt';
import { LoginForm } from '@/components/Auth/LoginForm';
import { ConstellationBackground } from '@/components/Auth/ConstellationBackground';
import { calculateProjectedGpa } from '@/lib/eschools/calculator';
import {
  DiaryData,
  SubjectItem,
  SavedAccount,
} from '@/lib/eschools/types';
import {
  loadSavedDiaryData,
  saveDiaryData,
  loadSettings,
  saveSettings,
  AppSettings,
  clearAllData,
  loadSavedAccounts,
  saveAccount,
  removeAccount,
  loadCustomTargets,
  saveCustomTarget,
  removeCustomTarget,
} from '@/lib/eschools/storage';
import {
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  Users,
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [diaryData, setDiaryData] = useState<DiaryData | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isBackgroundChecking, setIsBackgroundChecking] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<SubjectItem | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [isAccountsOpen, setIsAccountsOpen] = useState(false);
  const [targetModalSubject, setTargetModalSubject] = useState<SubjectItem | null>(null);

  // Расчет предполагаемого среднего балла по установленным целям
  const projectedStats = useMemo(() => {
    if (!diaryData) return null;
    return calculateProjectedGpa(diaryData.subjects, diaryData.overallGpa);
  }, [diaryData]);

  // Ref для отслеживания предыдущих отметок при 5-минутной автопроверке
  const prevSubjectsRef = useRef<SubjectItem[]>([]);

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  }, []);

  // Авторизация и первичная загрузка данных с e-schools.by
  const handleLogin = useCallback(async (credentials: {
    login: string;
    password?: string;
    subdomain?: string;
    sessionCookie?: string;
  }) => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('explicit_logout');
    }
    setIsSyncing(true);
    setLoginError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/eschools/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login: credentials.login,
          password: credentials.password,
          subdomain: credentials.subdomain,
          sessionCookie: credentials.sessionCookie,
          quarterNumber: 1,
        }),
      });

      const resJson = await response.json();
      if (!response.ok || !resJson.success) {
        throw new Error(resJson.error || 'Ошибка входа в e-schools.by');
      }

      const receivedData: DiaryData = resJson.data;

      // Применяем сохраненные ручные цели
      const storedTargets = loadCustomTargets();
      if (storedTargets && receivedData.subjects) {
        receivedData.subjects = receivedData.subjects.map((s) => ({
          ...s,
          targetGrade: storedTargets[s.id] || s.targetGrade,
        }));
      }

      setDiaryData(receivedData);
      saveDiaryData(receivedData);
      prevSubjectsRef.current = receivedData.subjects || [];

      const currentSettings = loadSettings();
      const newSettings: AppSettings = {
        ...currentSettings,
        subdomain: credentials.subdomain || 'e-schools.by',
        login: credentials.login,
        sessionCookie: resJson.sessionCookie || credentials.sessionCookie,
      };
      setSettings(newSettings);
      saveSettings(newSettings);

      // Сохраняем в список мультиаккаунтов с паролем для быстрого повторного входа
      const accountToSave: SavedAccount = {
        id: `acc_${credentials.login.toLowerCase()}`,
        login: credentials.login,
        password: credentials.password,
        studentName: receivedData.profile.studentName,
        schoolName: receivedData.profile.schoolName,
        className: receivedData.profile.className,
        sessionCookie: resJson.sessionCookie || credentials.sessionCookie,
        overallGpa: receivedData.overallGpa,
        isAdmin: receivedData.profile.isAdmin,
        lastSync: receivedData.profile.lastSync,
        addedAt: Date.now(),
      };
      saveAccount(accountToSave);
      setSavedAccounts(loadSavedAccounts());

      showToast(`Добро пожаловать, ${receivedData.profile.studentName}!`);
    } catch (err: any) {
      setLoginError(err.message || 'Ошибка подключения к серверу дневника.');
    } finally {
      setIsSyncing(false);
    }
  }, [showToast]);

  // Восстановление сессии и настроек при старте
  useEffect(() => {
    try {
      const saved = loadSavedDiaryData();
      const currentSettings = loadSettings();
      const loadedAccounts = loadSavedAccounts();
      const storedTargets = loadCustomTargets();

      setSettings(currentSettings);
      setSavedAccounts(loadedAccounts);

      if (saved) {
        // Применяем сохраненные ручные цели
        if (storedTargets && saved.subjects) {
          saved.subjects = saved.subjects.map((s) => ({
            ...s,
            targetGrade: storedTargets[s.id] || s.targetGrade,
          }));
        }
        setDiaryData(saved);
        prevSubjectsRef.current = saved.subjects || [];
      } else if (loadedAccounts.length > 0 && typeof window !== 'undefined') {
        const explicitLogout = sessionStorage.getItem('explicit_logout');
        if (!explicitLogout && loadedAccounts[0].login && loadedAccounts[0].password) {
          // Быстрый вход для повторного пользователя
          handleLogin({
            login: loadedAccounts[0].login,
            password: loadedAccounts[0].password,
            sessionCookie: loadedAccounts[0].sessionCookie,
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [handleLogin]);

  // Тихая фоновая автопроверка раз в 5 минут
  useEffect(() => {
    if (!diaryData || !settings?.login) return;

    const intervalId = setInterval(async () => {
      try {
        setIsBackgroundChecking(true);
        const response = await fetch(`${API_BASE_URL}/api/eschools/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            login: settings.login,
            subdomain: settings.subdomain,
            sessionCookie: settings.sessionCookie,
            quarterNumber: diaryData?.currentQuarter || 1,
          }),
        });

        if (!response.ok) return;
        const resJson = await response.json();
        if (!resJson.success || !resJson.data) return;

        const freshData: DiaryData = resJson.data;
        const prevSubs = prevSubjectsRef.current || [];

        // Сравниваем отметки
        const prevMarksMap = new Map<string, Set<string>>();
        prevSubs.forEach((s) => {
          prevMarksMap.set(s.id, new Set((s.grades || []).map((g) => g.id)));
        });

        const newGradesFound: { subject: string; value: number }[] = [];
        freshData.subjects.forEach((s) => {
          const prevSet = prevMarksMap.get(s.id);
          if (prevSet) {
            s.grades.forEach((g) => {
              if (!prevSet.has(g.id)) {
                newGradesFound.push({ subject: s.name, value: g.value });
              }
            });
          }
        });

        // Уведомления о новых отметках
        if (newGradesFound.length > 0) {
          newGradesFound.forEach((ng) => {
            showToast(`Новая отметка: ${ng.value} по ${ng.subject}`, 'success');

            // Системное браузерное уведомление (если разрешено)
            if (
              typeof window !== 'undefined' &&
              'Notification' in window &&
              Notification.permission === 'granted'
            ) {
              new Notification('Новая отметка в дневнике', {
                body: `${ng.value} по предмету ${ng.subject}`,
                icon: '/icon.svg',
              });
            }
          });
        }

        // Сохраняем ручные цели
        const storedTargets = loadCustomTargets();
        if (storedTargets && freshData.subjects) {
          freshData.subjects = freshData.subjects.map((s) => ({
            ...s,
            targetGrade: storedTargets[s.id] || s.targetGrade,
          }));
        }

        setDiaryData(freshData);
        saveDiaryData(freshData);
        prevSubjectsRef.current = freshData.subjects || [];
      } catch (err) {
        console.error('Ошибка фоновой автопроверка отметок:', err);
      } finally {
        setIsBackgroundChecking(false);
      }
    }, 300_000); // 5 минут = 300 000 мс

    return () => clearInterval(intervalId);
  }, [diaryData?.currentQuarter, settings, showToast]);

  // Переключение аккаунта
  const handleSwitchAccount = async (account: SavedAccount) => {
    setIsSyncing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/eschools/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login: account.login,
          password: account.password,
          sessionCookie: account.sessionCookie,
          quarterNumber: 1,
        }),
      });

      const resJson = await response.json();
      if (!response.ok || !resJson.success) {
        throw new Error(resJson.error || 'Не удалось переключить аккаунт');
      }

      const receivedData: DiaryData = resJson.data;
      const storedTargets = loadCustomTargets();
      if (storedTargets && receivedData.subjects) {
        receivedData.subjects = receivedData.subjects.map((s) => ({
          ...s,
          targetGrade: storedTargets[s.id] || s.targetGrade,
        }));
      }

      setDiaryData(receivedData);
      saveDiaryData(receivedData);
      prevSubjectsRef.current = receivedData.subjects || [];

      const currentSettings = loadSettings();
      const newSettings: AppSettings = {
        ...currentSettings,
        subdomain: 'e-schools.by',
        login: account.login,
        sessionCookie: resJson.sessionCookie || account.sessionCookie,
      };
      setSettings(newSettings);
      saveSettings(newSettings);

      showToast(`Вы вошли как ${receivedData.profile.studentName}`);
    } catch (err: any) {
      showToast(err.message || 'Ошибка смены профиля', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddNewAccount = async (credentials: { login: string; password?: string }) => {
    await handleLogin({
      login: credentials.login,
      password: credentials.password,
    });
  };

  const handleRemoveAccount = (id: string) => {
    removeAccount(id);
    setSavedAccounts(loadSavedAccounts());
    showToast('Профиль удален из сохраненных');
  };

  // Ручная установка цели по предмету
  const handleSaveTarget = (subjectId: string, targetVal: number) => {
    saveCustomTarget(subjectId, targetVal);
    if (!diaryData) return;

    const updatedSubjects = diaryData.subjects.map((s) => {
      if (s.id === subjectId) {
        return { ...s, targetGrade: targetVal };
      }
      return s;
    });

    const updatedData = { ...diaryData, subjects: updatedSubjects };
    setDiaryData(updatedData);
    saveDiaryData(updatedData);

    if (selectedSubject && selectedSubject.id === subjectId) {
      setSelectedSubject({ ...selectedSubject, targetGrade: targetVal });
    }

    showToast(`Цель ${targetVal} зафиксирована`);
  };

  // Сброс цели
  const handleClearTarget = (subjectId: string) => {
    removeCustomTarget(subjectId);
    if (!diaryData) return;

    const updatedSubjects = diaryData.subjects.map((s) => {
      if (s.id === subjectId) {
        const copy = { ...s };
        delete copy.targetGrade;
        return copy;
      }
      return s;
    });

    const updatedData = { ...diaryData, subjects: updatedSubjects };
    setDiaryData(updatedData);
    saveDiaryData(updatedData);

    if (selectedSubject && selectedSubject.id === subjectId) {
      const copy = { ...selectedSubject };
      delete copy.targetGrade;
      setSelectedSubject(copy);
    }

    showToast('Цель сброшена');
  };

  const handleSelectQuarter = async (quarterNum: number) => {
    if (!diaryData || !settings) return;
    setIsSyncing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/eschools/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login: settings.login,
          subdomain: settings.subdomain,
          sessionCookie: settings.sessionCookie,
          quarterNumber: quarterNum,
        }),
      });
      const resJson = await response.json();
      if (response.ok && resJson.success) {
        setDiaryData({ ...resJson.data, currentQuarter: quarterNum });
        saveDiaryData({ ...resJson.data, currentQuarter: quarterNum });
      }
    } catch {
      const updated = { ...diaryData, currentQuarter: quarterNum };
      setDiaryData(updated);
      saveDiaryData(updated);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('explicit_logout', 'true');
    }
    clearAllData();
    setDiaryData(null);
    setLoginError(null);
    setActiveTab('dashboard');
    showToast('Вы вышли из системы');
  };

  const handleOpenSubjectFromDashboard = (subject: SubjectItem) => {
    setSelectedSubject(subject);
    setActiveTab('subjects');
  };

  const isAdmin =
    diaryData?.profile?.isAdmin ||
    diaryData?.profile?.login?.toLowerCase() === 'nadaroot' ||
    settings?.login?.toLowerCase() === 'nadaroot';

  // ЭКРАН АВТОРИЗАЦИИ (Созвездия и мерцающие звезды на OLED черном фоне)
  if (!diaryData) {
    return (
      <div className="relative min-h-screen bg-black text-zinc-100 flex items-center justify-center overflow-hidden">
        <ConstellationBackground />
        <LoginForm
          onLogin={handleLogin}
          isLoading={isSyncing}
          errorMessage={loginError}
          savedAccounts={savedAccounts}
        />
      </div>
    );
  }

  // ОСНОВНОЙ ЭКРАН ДНЕВНИКА (Чистый, стильный контрастный темный интерфейс)
  return (
    <div className="relative min-h-screen bg-black text-zinc-100 flex flex-col md:flex-row antialiased selection:bg-zinc-800">
      {/* Десктопный сайдбар */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        profile={diaryData.profile}
        overallGpa={diaryData.overallGpa}
        projectedGpa={projectedStats?.projectedGpa}
        onOpenAccounts={() => setIsAccountsOpen(true)}
        accountsCount={savedAccounts.length || 1}
      />

      {/* Основная рабочая область */}
      <main className="relative z-10 flex-1 md:ml-64 flex flex-col min-h-screen pb-20 md:pb-8">
        {/* Мобильная верхняя панель (Header) */}
        <header className="md:hidden flex items-center justify-between p-4 bg-surface border-b border-surface-border sticky top-0 z-30 select-none">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-surface-subtle border border-surface-border flex items-center justify-center text-zinc-200">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-zinc-100 truncate max-w-[170px]">
                {diaryData.profile.studentName}
              </div>
              <div className="text-[10px] text-zinc-400 font-mono">
                {diaryData.profile.className}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAccountsOpen(true)}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono bg-surface-subtle border border-surface-border text-zinc-300"
            >
              <Users className="w-3 h-3 text-zinc-400" />
              <span>{savedAccounts.length || 1}</span>
            </button>
            <div className="px-2 py-1 rounded text-xs font-mono font-bold bg-surface-muted border border-surface-border text-zinc-100" title="Текущий средний балл">
              {diaryData.overallGpa.toFixed(2)}
            </div>
            {projectedStats && projectedStats.targetsSetCount > 0 && (
              <div
                className="hidden min-[380px]:flex items-center gap-1 px-1.5 py-1 rounded text-[11px] font-mono text-zinc-300 bg-surface-subtle border border-surface-border"
                title={`Предполагаемый средний балл по целям (${projectedStats.difference >= 0 ? '+' : ''}${projectedStats.difference})`}
              >
                <span className="text-zinc-500">🎯</span>
                <span className="font-bold">{projectedStats.projectedGpa.toFixed(2)}</span>
              </div>
            )}
          </div>
        </header>

        {/* Контейнер содержимого страницы */}
        <div className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6 lg:p-8 space-y-5">
          {/* Заголовок текущего раздела на десктопе */}
          <div className="hidden md:flex items-center justify-between pb-2 border-b border-surface-border/60">
            <div>
              <h2 className="text-lg font-bold text-zinc-100 tracking-tight flex items-center gap-2">
                {activeTab === 'dashboard' && 'Главная панель успеваемости'}
                {activeTab === 'averages' && 'Сводная таблица средних баллов'}
                {activeTab === 'goals' && 'Сколько оценок до цели'}
                {activeTab === 'subjects' && 'Журнал предметов и стратегия'}
                {activeTab === 'schedule' && 'Недельное расписание уроков'}
                {activeTab === 'admin' && 'Панель администратора'}
                {activeTab === 'settings' && 'Профиль и параметры'}
                {isBackgroundChecking && (
                  <span className="text-[10px] font-mono text-zinc-400 bg-surface-subtle px-2 py-0.5 rounded border border-surface-border">
                    автопроверка оценок...
                  </span>
                )}
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                {diaryData.profile.schoolName} • {diaryData.profile.className}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-400 font-mono">
                Обновлено: <span className="text-zinc-200">{diaryData.profile.lastSync || 'только что'}</span>
              </span>
            </div>
          </div>

          {/* Вкладка 1: Главная (Dashboard) */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Верхняя строка ключевых метрик */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <GpaCard
                  overallGpa={diaryData.overallGpa}
                  subjects={diaryData.subjects}
                />
                <QuarterCountdown
                  quarters={diaryData.quarters}
                  currentQuarter={diaryData.currentQuarter}
                  onSelectQuarter={handleSelectQuarter}
                />
                <LessonStatusWidget
                  schedule={diaryData.schedule}
                  quarters={diaryData.quarters}
                  currentQuarter={diaryData.currentQuarter}
                />
              </div>

              {/* Наглядные диаграммы успеваемости */}
              <GradesAnalytics
                subjects={diaryData.subjects}
                overallGpa={diaryData.overallGpa}
                onOpenSubject={handleOpenSubjectFromDashboard}
              />

              {/* График динамики баллов и Зоны внимания */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <PerformanceChart data={diaryData.historyGpa} />
                </div>
                <div>
                  <CriticalSubjects
                    subjects={diaryData.subjects}
                    onOpenSubject={handleOpenSubjectFromDashboard}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Вкладка 2: Таблица средних баллов (Сводная аналитика) */}
          {activeTab === 'averages' && (
            <AveragesTable
              subjects={diaryData.subjects}
              overallGpa={diaryData.overallGpa}
              onOpenSubject={handleOpenSubjectFromDashboard}
              onOpenTargetModal={(subject) => setTargetModalSubject(subject)}
            />
          )}

          {/* Вкладка 3: Сколько оценок до цели */}
          {activeTab === 'goals' && (
            <GoalsTargetTab
              subjects={diaryData.subjects}
              onOpenTargetModal={(subject) => setTargetModalSubject(subject)}
              onSaveTarget={handleSaveTarget}
              onClearTarget={handleClearTarget}
              onOpenSubjectDetail={handleOpenSubjectFromDashboard}
            />
          )}

          {/* Вкладка 4: Предметы и стратегия */}
          {activeTab === 'subjects' && (
            <SubjectList
              subjects={diaryData.subjects}
              selectedSubject={selectedSubject}
              onSelectSubject={setSelectedSubject}
            />
          )}

          {/* Вкладка 4: Расписание */}
          {activeTab === 'schedule' && (
            <WeekSchedule schedule={diaryData.schedule} />
          )}

          {/* Вкладка 5: Админ-панель */}
          {activeTab === 'admin' && (
            <AdminPanel
              profile={diaryData.profile}
              savedAccounts={savedAccounts}
              onSwitchAccount={handleSwitchAccount}
              onRemoveAccount={handleRemoveAccount}
              onForceResync={() => showToast('Данные синхронизированы')}
              isSyncing={isSyncing}
              diaryData={diaryData}
            />
          )}

          {/* Вкладка 6: Профиль пользователя (Минималистичный вид) */}
          {activeTab === 'settings' && (
            <AccountSettings
              profile={diaryData.profile}
              onLogout={handleLogout}
              onOpenAccounts={() => setIsAccountsOpen(true)}
              accountsCount={savedAccounts.length || 1}
            />
          )}
        </div>
      </main>

      {/* Мобильная нижняя навигация */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isAdmin={isAdmin}
      />

      {/* Модальное окно ручной установки и изменения цели */}
      <TargetModal
        subject={targetModalSubject}
        isOpen={!!targetModalSubject}
        onClose={() => setTargetModalSubject(null)}
        onSaveTarget={handleSaveTarget}
        onClearTarget={handleClearTarget}
      />

      {/* Подсказка по установке PWA на iPhone */}
      <IosInstallPrompt />

      {/* Модальное окно управления мультиаккаунтами */}
      <AccountManager
        currentProfile={diaryData.profile}
        savedAccounts={savedAccounts}
        onSwitchAccount={handleSwitchAccount}
        onAddNewAccount={handleAddNewAccount}
        onRemoveAccount={handleRemoveAccount}
        isOpen={isAccountsOpen}
        onClose={() => setIsAccountsOpen(false)}
      />

      {/* Всплывающее Toast-уведомление */}
      {toastMessage && (
        <div className="fixed bottom-16 md:bottom-6 right-4 md:right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-zinc-300 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-zinc-400 shrink-0" />
          )}
          <span className="font-medium">{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
}
