export const WEEKDAYS_SHORT = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
export const WEEKDAYS_MINI = ['П', 'В', 'С', 'Ч', 'П', 'С', 'В'];
export const WEEKDAYS_FULL = [
  'понедельник',
  'вторник',
  'среда',
  'четверг',
  'пятница',
  'суббота',
  'воскресенье',
];
export const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];
export const MONTHS_GEN = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];
const WEEKDAYS_ABBR = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

export const pad2 = (n: number) => String(n).padStart(2, '0');

export const dateKey = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const parseKey = (key: string): Date => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (d: Date, n: number): Date => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

export const mondayOf = (d: Date): Date => {
  const r = new Date(d);
  const dow = (r.getDay() + 6) % 7;
  r.setDate(r.getDate() - dow);
  return r;
};

export const todayKey = () => dateKey(new Date());

export const nowMinutes = () => {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
};

export const minLabel = (m: number) => `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;

/** Индекс дня недели: 0 = понедельник … 6 = воскресенье */
export const weekdayIndex = (key: string) => (parseKey(key).getDay() + 6) % 7;

export const humanDate = (key: string) => {
  const d = parseKey(key);
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
};

export const humanDateFull = (key: string) => {
  const d = parseKey(key);
  return `${WEEKDAYS_ABBR[d.getDay()]}, ${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
};

export function plural(n: number, forms: [string, string, string]): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}

export const timezonesLabel = () => {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'локальное время';
  const offset = -new Date().getTimezoneOffset() / 60;
  const sign = offset >= 0 ? '+' : '−';
  return `${tz} · GMT${sign}${Math.abs(offset)}`;
};
