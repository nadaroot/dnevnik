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
  fetchServerTargets,
} from '@/lib/eschools/storage';
import {
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  Users,
  RefreshCw,
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

  // Ref для отслеживания предыдущих отметок при автопроверке
  const prevSubjectsRef = useRef<SubjectItem[]>([]);

  // Стабильные ссылки для фонового 10-минутного автообновления
  const diaryDataRef = useRef<DiaryData | null>(null);
  const settingsRef = useRef<AppSettings | null>(null);
  const savedAccountsRef = useRef<SavedAccount[]>([]);
  const lastSyncTimeRef = useRef<number>(0);

  diaryDataRef.current = diaryData;
  settingsRef.current = settings;
  savedAccountsRef.current = savedAccounts;

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

      // Загружаем и синхронизируем цели с сервера
      let serverTargets = resJson.serverTargets || {};
      if (Object.keys(serverTargets).length === 0 && credentials.login) {
        try {
          serverTargets = await fetchServerTargets(credentials.login);
        } catch {}
      }

      const storedTargets = loadCustomTargets();
      const allTargets = { ...storedTargets, ...serverTargets };

      if (receivedData.subjects) {
        // Применяем цели и пересчитываем средний балл каждого предмета
        receivedData.subjects = receivedData.subjects.map((s) => {
          const validGrades = (s.grades || []).filter(
            (g) => typeof g.value === 'number' && g.value > 0
          );
          const calculatedAvg = validGrades.length > 0
            ? Number((validGrades.reduce((sum, g) => sum + g.value, 0) / validGrades.length).toFixed(2))
            : s.currentAverage;

          return {
            ...s,
            currentAverage: calculatedAvg,
            targetGrade: allTargets[s.id] || s.targetGrade,
          };
        });

        // Пересчитываем общий GPA по всем оцениваемым предметам
        const graded = receivedData.subjects.filter((s) => s.isGraded !== false && s.currentAverage > 0);
        if (graded.length > 0) {
          receivedData.overallGpa = Number(
            (graded.reduce((sum, s) => sum + s.currentAverage, 0) / graded.length).toFixed(2)
          );
        }
      }

      lastSyncTimeRef.current = Date.now();
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

        // В фоне проверяем и синхронизируем цели с сервера
        if (currentSettings.login) {
          fetchServerTargets(currentSettings.login)
            .then((serverTargets) => {
              if (serverTargets && Object.keys(serverTargets).length > 0) {
                setDiaryData((prev) => {
                  if (!prev || !prev.subjects) return prev;
                  const merged = prev.subjects.map((s) => ({
                    ...s,
                    targetGrade: serverTargets[s.id] || s.targetGrade,
                  }));
                  const updated = { ...prev, subjects: merged };
                  saveDiaryData(updated);
                  return updated;
                });
              }
            })
            .catch(() => {});
        }
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

  // Функция фонового обновления данных и пересчета среднего балла
  const runAutoSync = useCallback(
    async (isManual: boolean = false) => {
      const currentSettings = settingsRef.current;
      const currentDiary = diaryDataRef.current;
      const currentAccounts = savedAccountsRef.current;

      if (!currentDiary || !currentSettings?.login) return;

      try {
        setIsBackgroundChecking(true);

        // Ищем пароль в сохраненных аккаунтах для надежного релогина при протухании куки
        const activeAccount = currentAccounts.find(
          (a) => a.login?.toLowerCase() === currentSettings.login?.toLowerCase()
        );
        const password = activeAccount?.password;

        const response = await fetch(`${API_BASE_URL}/api/eschools/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            login: currentSettings.login,
            password: password,
            subdomain: currentSettings.subdomain || 'e-schools.by',
            sessionCookie: activeAccount?.sessionCookie || currentSettings.sessionCookie,
            quarterNumber: currentDiary?.currentQuarter || 1,
          }),
        });

        if (!response.ok) return;
        const resJson = await response.json().catch(() => ({}));
        if (!resJson.success || !resJson.data) return;

        const freshData: DiaryData = resJson.data;
        const prevSubs = prevSubjectsRef.current || [];

        // Сравниваем отметки по каждому предмету
        const prevMarksMap = new Map<string, Set<string>>();
        prevSubs.forEach((s) => {
          prevMarksMap.set(s.id, new Set((s.grades || []).map((g) => g.id)));
        });

        const newGradesFound: { subject: string; value: number }[] = [];
        freshData.subjects.forEach((s) => {
          const prevSet = prevMarksMap.get(s.id);
          if (prevSet) {
            (s.grades || []).forEach((g) => {
              if (!prevSet.has(g.id)) {
                newGradesFound.push({ subject: s.name, value: g.value });
              }
            });
          }
        });

        // Уведомления о новых отметках
        if (newGradesFound.length > 0) {
          newGradesFound.forEach((ng) => {
            showToast(`Новая отметка: ${ng.value} по предмету ${ng.subject}`, 'success');

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

        // Пересчитываем средний балл каждого предмета на основе полученных отметок
        freshData.subjects.forEach((s) => {
          const validGrades = (s.grades || []).filter(
            (g) => typeof g.value === 'number' && g.value > 0
          );
          if (validGrades.length > 0) {
            s.currentAverage = Number(
              (validGrades.reduce((sum, g) => sum + g.value, 0) / validGrades.length).toFixed(2)
            );
          }
        });

        // Пересчитываем общий GPA по всем оцениваемым предметам
        const gradedSubjects = freshData.subjects.filter(
          (s) => s.isGraded !== false && s.currentAverage > 0
        );
        if (gradedSubjects.length > 0) {
          freshData.overallGpa = Number(
            (
              gradedSubjects.reduce((sum, s) => sum + s.currentAverage, 0) /
              gradedSubjects.length
            ).toFixed(2)
          );
        }

        // Применяем цели: берем серверные цели + локальные
        const localTargets = loadCustomTargets();
        const allTargets = {
          ...localTargets,
          ...(resJson.serverTargets || {}),
        };

        if (allTargets && freshData.subjects) {
          freshData.subjects = freshData.subjects.map((s) => ({
            ...s,
            targetGrade: allTargets[s.id] || s.targetGrade,
          }));
        }

        // Обновляем время последней синхронизации
        const syncTimeStr = new Date().toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
        });
        freshData.profile.lastSync = syncTimeStr;
        lastSyncTimeRef.current = Date.now();

        setDiaryData(freshData);
        saveDiaryData(freshData);
        prevSubjectsRef.current = freshData.subjects || [];

        // Обновляем cookie если изменилась
        if (resJson.sessionCookie && resJson.sessionCookie !== currentSettings.sessionCookie) {
          const updatedSettings = {
            ...currentSettings,
            sessionCookie: resJson.sessionCookie,
          };
          setSettings(updatedSettings);
          saveSettings(updatedSettings);
        }

        // Обновляем запись активного профиля в сохраненных аккаунтах
        const activeAcc = currentAccounts.find(
          (a) => a.login?.toLowerCase() === currentSettings.login?.toLowerCase()
        );
        if (activeAcc) {
          saveAccount({
            ...activeAcc,
            sessionCookie: resJson.sessionCookie || activeAcc.sessionCookie,
            studentName: freshData.profile.studentName || activeAcc.studentName,
            overallGpa: freshData.overallGpa,
            lastSync: syncTimeStr,
          });
          setSavedAccounts(loadSavedAccounts());
        }

        if (isManual) {
          showToast('Оценки и средний балл обновлены', 'success');
        }
      } catch (err) {
        console.error('Ошибка автопроверки отметок:', err);
      } finally {
        setIsBackgroundChecking(false);
      }
    },
    [showToast]
  );

  // Фоновый планировщик: строго каждые 10 минут + проверка при старте PWA и возвращении на вкладку
  useEffect(() => {
    // 10 минут = 600 000 мс
    const TEN_MINUTES_MS = 600_000;

    // Для автономного PWA на рабочем столе (iOS / Android) сразу инициируем фоновую проверку свежести
    const isStandalone =
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true);

    const initTimer = setTimeout(() => {
      if (isStandalone || Date.now() - lastSyncTimeRef.current >= TEN_MINUTES_MS) {
        runAutoSync(false);
      }
    }, 1500);

    const intervalId = setInterval(() => {
      runAutoSync(false);
    }, TEN_MINUTES_MS);

    // При возврате пользователя на вкладку/разблокировке экрана на телефоне
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const elapsed = Date.now() - lastSyncTimeRef.current;
        if (elapsed >= TEN_MINUTES_MS) {
          runAutoSync(false);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(initTimer);
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [runAutoSync]);

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

      // Загружаем и синхронизируем цели с сервера
      let serverTargets = resJson.serverTargets || {};
      if (Object.keys(serverTargets).length === 0 && account.login) {
        try {
          serverTargets = await fetchServerTargets(account.login);
        } catch {}
      }

      const storedTargets = loadCustomTargets();
      const allTargets = { ...storedTargets, ...serverTargets };

      if (receivedData.subjects) {
        receivedData.subjects = receivedData.subjects.map((s) => {
          const validGrades = (s.grades || []).filter(
            (g) => typeof g.value === 'number' && g.value > 0
          );
          const calculatedAvg = validGrades.length > 0
            ? Number((validGrades.reduce((sum, g) => sum + g.value, 0) / validGrades.length).toFixed(2))
            : s.currentAverage;

          return {
            ...s,
            currentAverage: calculatedAvg,
            targetGrade: allTargets[s.id] || s.targetGrade,
          };
        });

        const graded = receivedData.subjects.filter((s) => s.isGraded !== false && s.currentAverage > 0);
        if (graded.length > 0) {
          receivedData.overallGpa = Number(
            (graded.reduce((sum, s) => sum + s.currentAverage, 0) / graded.length).toFixed(2)
          );
        }
      }

      lastSyncTimeRef.current = Date.now();
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

      const syncTimeStr = new Date().toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      });
      saveAccount({
        ...account,
        sessionCookie: resJson.sessionCookie || account.sessionCookie,
        studentName: receivedData.profile.studentName || account.studentName,
        overallGpa: receivedData.overallGpa,
        lastSync: syncTimeStr,
      });
      setSavedAccounts(loadSavedAccounts());

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

  // Глобальная синхронизация всех сохраненных аккаунтов для администратора
  const handleGlobalResyncAllAccounts = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    showToast('Запуск глобальной синхронизации аккаунтов...', 'success');

    try {
      const accountsToSync = loadSavedAccounts();
      const currentActiveLogin = (settingsRef.current?.login || diaryDataRef.current?.profile?.login || '').toLowerCase();

      // Если в сохраненных аккаунтах пусто, синхронизируем хотя бы текущий активный сеанс
      if (accountsToSync.length === 0) {
        await runAutoSync(true);
        return;
      }

      let successCount = 0;

      for (const acc of accountsToSync) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/eschools/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              login: acc.login,
              password: acc.password,
              subdomain: 'e-schools.by',
              sessionCookie: acc.sessionCookie,
              quarterNumber: diaryDataRef.current?.currentQuarter || 1,
            }),
          });

          if (!response.ok) continue;

          const resJson = await response.json().catch(() => ({}));
          if (!resJson.success || !resJson.data) continue;

          const freshData: DiaryData = resJson.data;

          // Динамический пересчет среднего балла каждого предмета
          freshData.subjects.forEach((s) => {
            const validGrades = (s.grades || []).filter(
              (g) => typeof g.value === 'number' && g.value > 0
            );
            if (validGrades.length > 0) {
              s.currentAverage = Number(
                (validGrades.reduce((sum, g) => sum + g.value, 0) / validGrades.length).toFixed(2)
              );
            }
          });

          // Пересчет общего GPA
          const gradedSubjects = freshData.subjects.filter(
            (s) => s.isGraded !== false && s.currentAverage > 0
          );
          if (gradedSubjects.length > 0) {
            freshData.overallGpa = Number(
              (
                gradedSubjects.reduce((sum, s) => sum + s.currentAverage, 0) /
                gradedSubjects.length
              ).toFixed(2)
            );
          }

          const syncTimeStr = new Date().toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
          });

          // Обновляем запись аккаунта в локальном хранилище
          saveAccount({
            ...acc,
            sessionCookie: resJson.sessionCookie || acc.sessionCookie,
            studentName: freshData.profile.studentName || acc.studentName,
            overallGpa: freshData.overallGpa,
            lastSync: syncTimeStr,
          });

          // Если это текущий активный профиль — обновляем стейт дневника
          if (acc.login.toLowerCase() === currentActiveLogin) {
            const localTargets = loadCustomTargets();
            const allTargets = {
              ...localTargets,
              ...(resJson.serverTargets || {}),
            };

            if (allTargets && freshData.subjects) {
              freshData.subjects = freshData.subjects.map((s) => ({
                ...s,
                targetGrade: allTargets[s.id] || s.targetGrade,
              }));
            }

            freshData.profile.lastSync = syncTimeStr;
            lastSyncTimeRef.current = Date.now();

            setDiaryData(freshData);
            saveDiaryData(freshData);
            prevSubjectsRef.current = freshData.subjects || [];

            if (resJson.sessionCookie && resJson.sessionCookie !== settingsRef.current?.sessionCookie) {
              const updatedSettings = {
                ...settingsRef.current!,
                sessionCookie: resJson.sessionCookie,
              };
              setSettings(updatedSettings);
              saveSettings(updatedSettings);
            }
          }

          successCount++;
        } catch (itemErr) {
          console.error(`Ошибка синхронизации аккаунта ${acc.login}:`, itemErr);
        }
      }

      setSavedAccounts(loadSavedAccounts());

      if (successCount > 0) {
        showToast(
          `Глобальный ресинк завершен: ${successCount} из ${accountsToSync.length} обновлено`,
          'success'
        );
      } else {
        showToast('Не удалось обновить данные аккаунтов', 'error');
      }
    } catch (err: any) {
      console.error('Ошибка глобального ресинка:', err);
      showToast(err.message || 'Ошибка глобальной синхронизации', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Ручная установка цели по предмету (с синхронизацией на сервере)
  const handleSaveTarget = (subjectId: string, targetVal: number) => {
    const activeLogin = diaryData?.profile?.login || settings?.login;
    saveCustomTarget(subjectId, targetVal, activeLogin);
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

    showToast(`Цель ${targetVal} зафиксирована и сохранена на сервере`);
  };

  // Сброс цели (с синхронизацией на сервере)
  const handleClearTarget = (subjectId: string) => {
    const activeLogin = diaryData?.profile?.login || settings?.login;
    removeCustomTarget(subjectId, activeLogin);
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
      const activeAccount = savedAccountsRef.current.find(
        (a) => a.login?.toLowerCase() === settings.login?.toLowerCase()
      );
      const password = activeAccount?.password;

      const response = await fetch(`${API_BASE_URL}/api/eschools/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login: settings.login,
          password: password,
          subdomain: settings.subdomain,
          sessionCookie: activeAccount?.sessionCookie || settings.sessionCookie,
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
            <button
              onClick={() => runAutoSync(true)}
              disabled={isBackgroundChecking || isSyncing}
              title="Обновить оценки прямо сейчас"
              className="p-1.5 rounded bg-surface-subtle border border-surface-border text-zinc-400 hover:text-zinc-200 disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isBackgroundChecking || isSyncing ? 'animate-spin' : ''}`} />
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
              <button
                onClick={() => runAutoSync(true)}
                disabled={isBackgroundChecking || isSyncing}
                title="Обновить оценки и средний балл прямо сейчас"
                className="p-1.5 rounded hover:bg-surface-subtle text-zinc-400 hover:text-zinc-200 transition-colors border border-surface-border disabled:opacity-40"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isBackgroundChecking || isSyncing ? 'animate-spin' : ''}`} />
              </button>
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
              onForceResync={handleGlobalResyncAllAccounts}
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
              onManualSync={() => runAutoSync(true)}
              isSyncing={isBackgroundChecking || isSyncing}
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
