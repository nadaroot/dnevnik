import * as cheerio from 'cheerio';
import { DiaryData, SubjectItem, GradeEntry, DaySchedule, LessonItem, QuarterInfo, SubjectPeriodType, WeekScheduleData } from './types';
import { calculateAverage } from './calculator';

export interface ESchoolsCredentials {
  login: string;
  password?: string;
  subdomain?: string;
  sessionCookie?: string;
}

export class ESchoolsClient {
  private baseUrl: string;
  private sessionCookie: string | null = null;
  private authToken: string | null = null;

  constructor(subdomain?: string, sessionCookie?: string) {
    const cleanSubdomain = (subdomain || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
    if (cleanSubdomain && cleanSubdomain.includes('.')) {
      this.baseUrl = `https://${cleanSubdomain}`;
    } else if (cleanSubdomain && cleanSubdomain !== 'schools.by') {
      this.baseUrl = `https://${cleanSubdomain}.schools.by`;
    } else {
      this.baseUrl = 'https://schools.by';
    }

    if (sessionCookie) {
      this.sessionCookie = sessionCookie;
      if (sessionCookie.startsWith('auth_token=')) {
        this.authToken = sessionCookie.replace('auth_token=', '');
      }
    }
  }

  /**
   * Сбор кук из заголовков ответа с поддержкой getSetCookie
   */
  private extractCookies(response: Response): string[] {
    const headers = response.headers as any;
    if (typeof headers.getSetCookie === 'function') {
      return headers.getSetCookie().map((c: string) => c.split(';')[0].trim());
    }
    const raw = response.headers.get('set-cookie') || '';
    if (!raw) return [];
    return raw.split(/,(?=[^;]+=[^;]+)/).map(part => part.split(';')[0].trim());
  }

  /**
   * 1. Вход для ОБУЧАЮЩЕГОСЯ (ученика) через государственную систему РИОС SSO (oauth.rios.unibel.by)
   */
  private async loginStudentRios(user: string, pass: string): Promise<string> {
    const initRes = await fetch('https://diary.e-schools.by/api/v1/admin/auth/login/student', {
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36'
      }
    });

    const oauthLoginUrl = initRes.headers.get('location');
    if (!oauthLoginUrl) {
      throw new Error('Сервер РИОС SSO временно недоступен.');
    }
    const initCookies = this.extractCookies(initRes);
    const cvrfCookie = initCookies.find(c => c.startsWith('cvrf_id='));

    const pageRes = await fetch(oauthLoginUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36'
      }
    });
    const pageCookies = this.extractCookies(pageRes);
    const pageHtml = await pageRes.text();
    const $ = cheerio.load(pageHtml);
    const token = $('input[name="__RequestVerificationToken"]').val();
    const returnUrl = $('input[name="Input.ReturnUrl"]').val() || '';

    if (!token) {
      throw new Error('Не удалось получить токен проверки РИОС.');
    }

    const riosCookieMap = new Map<string, string>();
    pageCookies.forEach(c => riosCookieMap.set(c.split('=')[0], c));

    const body = new URLSearchParams({
      'Input.Username': user,
      'Input.Password': pass,
      'Input.RememberLogin': 'true',
      'Input.ReturnUrl': String(returnUrl),
      'Input.Button': 'login',
      '__RequestVerificationToken': String(token)
    });

    const postRes = await fetch('https://oauth.rios.unibel.by/Account/Login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': Array.from(riosCookieMap.values()).join('; '),
        'Referer': oauthLoginUrl,
        'Origin': 'https://oauth.rios.unibel.by',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36'
      },
      body: body.toString(),
      redirect: 'manual'
    });

    const postCookies = this.extractCookies(postRes);
    postCookies.forEach(c => riosCookieMap.set(c.split('=')[0], c));

    const postLocation = postRes.headers.get('location');
    if (!postLocation || postLocation.includes('error=')) {
      const postHtml = await postRes.text();
      const $p = cheerio.load(postHtml);
      const errText = $p('.text-danger, .validation-summary-errors').text().trim();
      throw new Error(errText || 'Неверный логин или пароль обучающегося в системе РИОС.');
    }

    const authCbUrl = postLocation.startsWith('http') ? postLocation : `https://oauth.rios.unibel.by${postLocation}`;
    const authCbRes = await fetch(authCbUrl, {
      headers: {
        'Cookie': Array.from(riosCookieMap.values()).join('; '),
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36'
      },
      redirect: 'manual'
    });

    const diaryCbUrl = authCbRes.headers.get('location');
    if (!diaryCbUrl || diaryCbUrl.includes('error=')) {
      throw new Error('Доступ отклонен шлюзом РИОС SSO.');
    }

    const diaryCookieMap = new Map<string, string>();
    initCookies.forEach(c => diaryCookieMap.set(c.split('=')[0], c));

    const diaryFinalRes = await fetch(diaryCbUrl, {
      headers: {
        'Cookie': Array.from(diaryCookieMap.values()).join('; '),
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36'
      },
      redirect: 'manual'
    });

    const preauthLoc = diaryFinalRes.headers.get('location') || '';
    const dataUuid = preauthLoc.match(/data=([a-f0-9-]+)/)?.[1];
    if (!dataUuid) {
      throw new Error('Не удалось завершить сессию входа.');
    }

    const dataRes = await fetch(`https://diary.e-schools.by/api/v1/admin/auth/data_for_login/${dataUuid}`, {
      headers: {
        'Cookie': Array.from(diaryCookieMap.values()).join('; '),
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36'
      }
    });

    if (!dataRes.ok) {
      throw new Error('Не удалось получить данные профиля обучающегося.');
    }

    const dataJson = await dataRes.json();
    const profileId = dataJson.profile_id;
    const schoolId = dataJson.schools?.[0]?.id;
    if (!profileId || !schoolId) {
      throw new Error('Аккаунт обучающегося не привязан к учреждению образования.');
    }

    const rawToken = `${profileId}:${schoolId}:student`;
    const base64Token = Buffer.from(rawToken).toString('base64');

    const tokenRes = await fetch(`https://diary.e-schools.by/api/v1/auth/login?token=${encodeURIComponent(base64Token)}`, {
      headers: {
        'Cookie': cvrfCookie || '',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36'
      }
    });

    if (!tokenRes.ok) {
      const errJson = await tokenRes.json().catch(() => ({}));
      throw new Error(errJson.value || 'Не удалось получить токен доступа к дневнику.');
    }

    const tokenJson = await tokenRes.json();
    if (!tokenJson.auth_token) {
      throw new Error('Токен авторизации не был выдан сервером.');
    }

    return tokenJson.auth_token;
  }

  /**
   * 2. Вход для РОДИТЕЛЯ через REST API diary.e-schools.by
   */
  private async loginParentApi(user: string, pass: string): Promise<string> {
    const apiResp = await fetch('https://diary.e-schools.by/api/v1/auth/login/parent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({ login: user, password: pass }),
    });

    if (!apiResp.ok) {
      const errJson = await apiResp.json().catch(() => ({}));
      throw new Error(errJson.value || 'Неверный логин или пароль родителя.');
    }

    const json = await apiResp.json();
    if (!json.auth_token) {
      throw new Error('Сервер не вернул токен родителя.');
    }

    return json.auth_token;
  }

  /**
   * 3. Вход через классический Django-портал schools.by
   */
  private async loginDjangoSchoolsBy(user: string, pass: string): Promise<string> {
    const loginUrl = `${this.baseUrl}/login`;
    const pageResp = await fetch(loginUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!pageResp.ok) {
      throw new Error(`Сервер schools.by временно недоступен (${pageResp.status})`);
    }

    const html = await pageResp.text();
    const $ = cheerio.load(html);
    const csrfToken = $('input[name="csrfmiddlewaretoken"]').val() || '';
    const cookies = this.extractCookies(pageResp);
    let cookieString = cookies.join('; ');
    if (!cookieString.includes('csrftoken=') && csrfToken) {
      cookieString += (cookieString ? '; ' : '') + `csrftoken=${csrfToken}`;
    }

    const formData = new URLSearchParams();
    formData.append('csrfmiddlewaretoken', String(csrfToken));
    formData.append('username', user);
    formData.append('password', pass);
    formData.append('|123', '|123');

    const postResp = await fetch(loginUrl, {
      method: 'POST',
      body: formData.toString(),
      redirect: 'manual',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookieString,
        'Referer': loginUrl,
        'Origin': this.baseUrl,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
      },
    });

    const postCookies = this.extractCookies(postResp);
    const combinedCookies = [...cookieString.split(';').map(c => c.trim()), ...postCookies];
    const hasSession = combinedCookies.some(c => c.startsWith('sessionid='));

    if (hasSession || (postResp.status === 302 && !postResp.headers.get('location')?.includes('/login'))) {
      return combinedCookies.filter(Boolean).join('; ');
    }

    const errorHtml = await postResp.text();
    const $err = cheerio.load(errorHtml);
    const errorText = $err('ul.errorlist li, .error_messages, .alert-danger').first().text().trim();
    throw new Error(errorText || 'Неверный логин или пароль на портале schools.by.');
  }

  /**
   * Универсальный метод аутентификации (проверяет ученика РИОС, родителя, затем schools.by)
   */
  async login(credentials: ESchoolsCredentials): Promise<string> {
    if (credentials.sessionCookie) {
      this.sessionCookie = credentials.sessionCookie;
      if (credentials.sessionCookie.startsWith('auth_token=')) {
        this.authToken = credentials.sessionCookie.replace('auth_token=', '');
      }
      return this.sessionCookie;
    }

    const user = (credentials.login || '').trim();
    const pass = credentials.password || '';

    if (!user || !pass) {
      throw new Error('Укажите логин и пароль.');
    }

    let lastError: string | null = null;

    // 1. Вход для обучающегося (ученика) через РИОС SSO
    try {
      const studentToken = await this.loginStudentRios(user, pass);
      if (studentToken) {
        this.authToken = studentToken;
        this.sessionCookie = `auth_token=${studentToken}`;
        return this.sessionCookie;
      }
    } catch (e: any) {
      lastError = e.message;
    }

    // 2. Вход для родителя через API diary.e-schools.by
    try {
      const parentToken = await this.loginParentApi(user, pass);
      if (parentToken) {
        this.authToken = parentToken;
        this.sessionCookie = `auth_token=${parentToken}`;
        return this.sessionCookie;
      }
    } catch (e: any) {
      // Игнорируем и пробуем следующий шлюз
    }

    // 3. Вход через классический портал schools.by
    try {
      const djangoSession = await this.loginDjangoSchoolsBy(user, pass);
      if (djangoSession) {
        this.sessionCookie = djangoSession;
        return this.sessionCookie;
      }
    } catch (e: any) {
      if (!lastError) lastError = e.message;
    }

    throw new Error(lastError || 'Неверный логин или пароль. Проверьте правильность введенных данных.');
  }

  /**
   * Загрузка данных дневника из официального REST API e-schools.by
   */
  async fetchDiaryDataEschools(): Promise<DiaryData> {
    const token = this.authToken;
    if (!token) throw new Error('Не авторизован.');

    const headers = {
      'Authorization': token,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36'
    };

    // 1. Профиль
    const meRes = await fetch('https://diary.e-schools.by/api/v1/admin/auth/me', { headers });
    if (!meRes.ok) {
      throw new Error('Сессия дневника истекла. Выполните повторный вход.');
    }
    const me = await meRes.json();

    const studentId = me.profile_id;
    const schoolId = me.school_id;
    const schoolName = me.school_name || 'Средняя школа';
    const studentName = me.full_name || `${me.last_name || ''} ${me.first_name || ''}`.trim();

    // 2. Класс
    const classesRes = await fetch(`https://diary.e-schools.by/api/v1/education/diary/schools/${schoolId}/students/${studentId}/classes`, { headers });
    const classes = await classesRes.json().catch(() => []);
    const currentClass = classes?.[0];
    const classId = currentClass?.uuid;
    const className = currentClass?.class_number || `${currentClass?.level || 9}${currentClass?.label || 'А'}`;

    // 3. Список предметов
    const subjRes = await fetch(`https://diary.e-schools.by/api/v1/education/diary/schools/${schoolId}/classes/${classId}/students/${studentId}/educational_subjects`, { headers });
    const subjectsList: { uuid: string; name: string }[] = await subjRes.json().catch(() => []);

    // 4. Недели учебного года
    const weeksRes = await fetch('https://diary.e-schools.by/api/v1/education/diary/time_activities/week_activities', { headers });
    const weeks: any[] = await weeksRes.json().catch(() => []);

    const now = Date.now();
    const currentWeek = weeks.find(w => now >= w.start_ts && now <= w.end_ts) || weeks[0];

    // 5. Оценки и уроки по прошедшим и текущей неделям
    const pastWeeks = weeks.filter(w => w.start_ts <= now);

    const gradesBySubject: Record<string, GradeEntry[]> = {};
    subjectsList.forEach(s => {
      gradesBySubject[s.name] = [];
    });

    let currentWeekSchedule: DaySchedule[] = [];
    const allWeeksSchedule: WeekScheduleData[] = [];
    const DAY_NAMES = ['', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

    for (let wIdx = 0; wIdx < pastWeeks.length; wIdx++) {
      const w = pastWeeks[wIdx];
      const lessonsUrl = `https://diary.e-schools.by/api/v1/education/diary/schools/${schoolId}/classes/${classId}/students/${studentId}/lessons?week_activity_uuid=${w.uuid}`;
      const lRes = await fetch(lessonsUrl, { headers });
      if (!lRes.ok) continue;

      const days: any[] = await lRes.json().catch(() => []);
      const isThisWeek = w.uuid === currentWeek?.uuid;

      const weekDays: DaySchedule[] = days.map((d: any) => ({
        dayOfWeek: d.day_of_week,
        dayName: DAY_NAMES[d.day_of_week] || `День ${d.day_of_week}`,
        date: new Date(d.date).toISOString().split('T')[0],
        lessons: (d.slots || []).map((slot: any) => {
          let gradeVal: number | undefined;
          let gradeTopic: string | undefined;
          if (slot.lesson_mark && slot.lesson_mark.mark) {
            const numVal = parseInt(slot.lesson_mark.mark, 10);
            if (!isNaN(numVal) && numVal >= 1 && numVal <= 10) {
              gradeVal = numVal;
              gradeTopic = slot.topic || slot.lesson_mark.comment || undefined;
            }
          }
          return {
            id: slot.lesson_uuid,
            lessonNumber: slot.number,
            startTime: (slot.start_time || '').slice(0, 5),
            endTime: '',
            subject: slot.subject_title || '',
            room: '',
            homework: slot.homework || undefined,
            grade: gradeVal,
            gradeTopic: gradeTopic,
          };
        }),
      }));

      allWeeksSchedule.push({
        weekIndex: wIdx + 1,
        weekId: w.uuid,
        startDate: new Date(w.start_ts).toISOString().split('T')[0],
        endDate: new Date(w.end_ts).toISOString().split('T')[0],
        isCurrent: isThisWeek,
        days: weekDays,
      });

      if (isThisWeek) {
        currentWeekSchedule = weekDays;
      }

      for (const d of days) {
        const dateStr = new Date(d.date).toISOString().split('T')[0];
        for (const slot of d.slots || []) {
          const sTitle = slot.subject_title;
          const markObj = slot.lesson_mark;
          if (sTitle && markObj && markObj.mark) {
            const numVal = parseInt(markObj.mark, 10);
            if (!isNaN(numVal) && numVal >= 1 && numVal <= 10) {
              if (!gradesBySubject[sTitle]) {
                gradesBySubject[sTitle] = [];
              }
              gradesBySubject[sTitle].push({
                id: markObj.uuid || `${slot.lesson_uuid}_mark`,
                value: numVal,
                date: dateStr,
                topic: slot.topic || markObj.comment || undefined,
                type: 'regular'
              });
            }
          }
        }
      }
    }

    // Подсчет количества уроков в неделю для каждого предмета
    const lessonsCountBySubject: Record<string, number> = {};
    currentWeekSchedule.forEach((day) => {
      day.lessons.forEach((l) => {
        if (l.subject) {
          lessonsCountBySubject[l.subject] = (lessonsCountBySubject[l.subject] || 0) + 1;
        }
      });
    });

    // Собираем SubjectItem[]
    let totalGradeSum = 0;
    let totalGradeCount = 0;

    const subjects: SubjectItem[] = Object.keys(gradesBySubject).map((subjName, idx) => {
      const sGrades = gradesBySubject[subjName].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const gpa = calculateAverage(sGrades.map(g => g.value));

      const lowerName = subjName.toLowerCase();
      // Безоценочные воспитательные часы (оценки вообще не ставятся)
      const isClassHour =
        lowerName.includes('информационный час') ||
        lowerName.includes('классный час') ||
        lowerName.includes('час информирования');

      // Предметы зачетной системы (зачет / незачет, оценки 1-10 не ставятся)
      const isPassFail =
        lowerName.includes('искусство') ||
        lowerName.includes('мхк') ||
        lowerName.includes('художественная культура');

      const isExplicitNonGraded = isClassHour || isPassFail;

      const lessonsPerWeek = lessonsCountBySubject[subjName] || 0;

      // Полугодовые предметы: 1 раз в неделю (Черчение, ОБЖ и т.д.)
      const isSemesterSubject =
        !isExplicitNonGraded && (
          lessonsPerWeek === 1 ||
          lowerName.includes('черчение') ||
          lowerName.includes('обж') ||
          lowerName.includes('допризывная')
        );

      const isGraded = !isExplicitNonGraded;
      const gradingType: 'grades' | 'pass_fail' | 'none' = isPassFail
        ? 'pass_fail'
        : isClassHour
        ? 'none'
        : 'grades';

      const periodType: SubjectPeriodType = isExplicitNonGraded
        ? 'none'
        : isSemesterSubject
        ? 'semester'
        : 'quarter';

      // Оценки учитываются в общем среднем балле только если предмет оцениваемый
      if (isGraded && sGrades.length > 0) {
        totalGradeSum += sGrades.reduce((sum, g) => sum + g.value, 0);
        totalGradeCount += sGrades.length;
      }

      // Определение риска:
      // - Безоценочные никогда не попадают в риск
      // - Полугодовые (1 ч/нед): смягченный порог < 5.0
      // - Четвертные: стандартный порог < 6.0
      const critical = isGraded && (
        isSemesterSubject ? (gpa > 0 && gpa < 5.0) : (gpa > 0 && gpa < 6.0)
      );

      const roundedQuarter = isGraded && sGrades.length > 0 ? Math.round(gpa) : undefined;

      return {
        id: `subj_${idx}_${subjName}`,
        name: subjName,
        grades: isExplicitNonGraded ? [] : sGrades,
        currentAverage: isExplicitNonGraded ? 0 : gpa,
        quarterGrade: roundedQuarter,
        quarterGrades: {
          q1: roundedQuarter,
        },
        critical,
        trend: 'stable' as const,
        periodType,
        isGraded,
        gradingType,
        lessonsPerWeek,
      };
    }).sort((a, b) => {
      // Сначала предметы с оценками, затем без отметок
      if (a.isGraded && !b.isGraded) return -1;
      if (!a.isGraded && b.isGraded) return 1;
      if (a.grades.length > 0 && b.grades.length === 0) return -1;
      if (a.grades.length === 0 && b.grades.length > 0) return 1;
      return a.name.localeCompare(b.name, 'ru');
    });

    const overallGpa = totalGradeCount > 0 ? Number((totalGradeSum / totalGradeCount).toFixed(2)) : 0;

    // История изменения GPA по дням
    const allChronologicalGrades: { date: string; value: number }[] = [];
    subjects.forEach(s => {
      s.grades.forEach(g => {
        allChronologicalGrades.push({ date: g.date, value: g.value });
      });
    });
    allChronologicalGrades.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const historyGpa: { date: string; gpa: number }[] = [];
    let runningSum = 0;
    let runningCount = 0;
    const seenDates = new Set<string>();

    for (const g of allChronologicalGrades) {
      runningSum += g.value;
      runningCount++;
      if (!seenDates.has(g.date)) {
        seenDates.add(g.date);
        historyGpa.push({
          date: g.date,
          gpa: Number((runningSum / runningCount).toFixed(2))
        });
      } else {
        historyGpa[historyGpa.length - 1].gpa = Number((runningSum / runningCount).toFixed(2));
      }
    }

    const quarters: QuarterInfo[] = [
      { number: 1, name: 'I четверть', startDate: '2026-09-01', endDate: '2026-10-31', isActive: true },
      { number: 2, name: 'II четверть', startDate: '2026-11-09', endDate: '2026-12-24', isActive: false },
      { number: 3, name: 'III четверть', startDate: '2027-01-08', endDate: '2027-03-27', isActive: false },
      { number: 4, name: 'IV четверть', startDate: '2027-04-05', endDate: '2027-05-31', isActive: false },
    ];

    return {
      profile: {
        studentName,
        schoolName,
        className,
        subdomain: 'e-schools.by',
        lastSync: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        isAdmin: false,
      },
      quarters,
      currentQuarter: 1,
      subjects,
      schedule: currentWeekSchedule,
      weeksSchedule: allWeeksSchedule,
      overallGpa,
      historyGpa
    };
  }

  /**
   * Главный метод получения данных дневника (выбирает REST API или парсинг HTML)
   */
  async getDiaryData(quarterNumber: number = 1): Promise<DiaryData> {
    if (this.authToken) {
      return await this.fetchDiaryDataEschools();
    }

    const diaryHtml = await this.fetchDiaryHtml(quarterNumber);
    const scheduleHtml = await this.fetchScheduleHtml();
    return this.parseDiaryHtml(diaryHtml, scheduleHtml);
  }

  /**
   * Загрузка HTML для классического schools.by
   */
  async fetchDiaryHtml(quarterNumber: number = 1): Promise<string> {
    const urlsToTry = [
      `${this.baseUrl}/dnevnik/quarter/${quarterNumber}`,
      `${this.baseUrl}/dnevnik`,
    ];

    for (const url of urlsToTry) {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Cookie': this.sessionCookie || '',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      if (response.ok) {
        return await response.text();
      }
    }

    throw new Error('Не удалось загрузить страницу дневника.');
  }

  async fetchScheduleHtml(): Promise<string> {
    const response = await fetch(`${this.baseUrl}/timetable`, {
      method: 'GET',
      headers: {
        'Cookie': this.sessionCookie || '',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
      },
    });

    if (response.ok) {
      return await response.text();
    }
    return '';
  }

  /**
   * Парсинг HTML дневника schools.by
   */
  parseDiaryHtml(diaryHtml: string, scheduleHtml?: string): DiaryData {
    const $ = cheerio.load(diaryHtml);

    const studentName = $('.user_info .name, .profile_name, .header_user_name, .b-user-name').first().text().trim() || 'Учащийся';
    const schoolName = $('.school_title, .b-school-name, .header_school_name').first().text().trim() || 'Средняя школа';
    const className = $('.class_name, .current_class').first().text().trim() || 'Класс';

    const subjects: SubjectItem[] = [];
    let totalGradeSum = 0;
    let totalGradeCount = 0;

    $('.dnevnik_table tr, table.diary_table tr, .table_marks tr').each((idx, row) => {
      const nameEl = $(row).find('.subject_name, td:first-child a, .lesson_name');
      const subjectName = nameEl.text().trim();
      if (!subjectName || subjectName.toLowerCase().includes('предмет')) return;

      const grades: GradeEntry[] = [];
      $(row).find('.mark, .grade, .mark_box').each((mIdx, cell) => {
        const text = $(cell).text().trim();
        const val = parseInt(text, 10);
        if (!isNaN(val) && val >= 1 && val <= 10) {
          grades.push({
            id: `g_${idx}_${mIdx}`,
            value: val,
            date: new Date().toISOString().split('T')[0],
            type: 'regular',
          });
          totalGradeSum += val;
          totalGradeCount++;
        }
      });

      const avg = calculateAverage(grades.map(g => g.value));
      subjects.push({
        id: `subj_${idx}`,
        name: subjectName,
        grades,
        currentAverage: avg,
        critical: avg > 0 && avg < 6.0,
        trend: 'stable',
      });
    });

    const overallGpa = totalGradeCount > 0 ? Number((totalGradeSum / totalGradeCount).toFixed(2)) : 0;

    const quarters: QuarterInfo[] = [
      { number: 1, name: 'I четверть', startDate: '2026-09-01', endDate: '2026-10-31', isActive: true },
      { number: 2, name: 'II четверть', startDate: '2026-11-09', endDate: '2026-12-24', isActive: false },
      { number: 3, name: 'III четверть', startDate: '2027-01-08', endDate: '2027-03-27', isActive: false },
      { number: 4, name: 'IV четверть', startDate: '2027-04-05', endDate: '2027-05-31', isActive: false },
    ];

    return {
      profile: {
        studentName,
        schoolName,
        className,
        subdomain: 'schools.by',
        lastSync: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      },
      quarters,
      currentQuarter: 1,
      subjects,
      schedule: [],
      overallGpa,
      historyGpa: [],
    };
  }
}
