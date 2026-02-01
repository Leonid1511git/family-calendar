/**
 * Парсер для создания событий из текстовых сообщений Telegram бота
 * Поддерживает естественный язык на русском
 */

import * as chrono from 'chrono-node';
import { addHours, startOfDay, format, isAfter } from 'date-fns';
import { ru } from 'date-fns/locale';

export interface ParsedEventData {
  title: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  description?: string;
}

/**
 * Парсит текст сообщения и извлекает информацию о событии
 * 
 * Примеры:
 * - "Баня 15го в 18"
 * - "Театр суббота 19:00"
 * - "ДР Игоря завтра в 15"
 * - "Командировка с 21 по 15 февраля"
 */
export function parseTelegramMessage(text: string): ParsedEventData | null {
  if (!text || text.trim().length === 0) {
    return null;
  }

  const normalizedText = text.trim();
  const now = new Date();

  // Парсим даты и время с помощью chrono-node (русская локаль)
  const parsedResults = chrono.ru.parse(normalizedText, now, { forwardDate: true });

  if (parsedResults.length === 0) {
    // Если не удалось распарсить дату, создаем событие на сегодня в 18:00
    return createDefaultEvent(normalizedText, now);
  }

  const firstResult = parsedResults[0];
  const startDate = firstResult.start.date();
  
  // Определяем конец события
  let endDate: Date;
  if (firstResult.end) {
    endDate = firstResult.end.date();
  } else {
    // По умолчанию событие длится 1 час
    endDate = addHours(startDate, 1);
  }

  // Извлекаем название события (текст до даты)
  const title = extractTitle(normalizedText, firstResult);

  // Проверяем, является ли событие целым днем
  const allDay = isAllDayEvent(firstResult, normalizedText);

  return {
    title: title || 'Событие',
    startDate,
    endDate,
    allDay,
  };
}

/**
 * Извлекает название события из текста
 */
function extractTitle(text: string, parsedResult: any): string {
  const startIndex = parsedResult.index;
  const endIndex = startIndex + parsedResult.text.length;
  
  // Берем текст до начала парсинга даты
  let title = text.substring(0, startIndex).trim();
  
  // Если название пустое, берем текст после даты
  if (!title) {
    title = text.substring(endIndex).trim();
  }
  
  // Если все еще пустое, используем весь текст без даты
  if (!title) {
    title = text.replace(parsedResult.text, '').trim();
  }
  
  // Очищаем от лишних слов
  title = title
    .replace(/^(в|на|с|по|завтра|сегодня|послезавтра|вчера)\s+/i, '')
    .replace(/\s+(в|на|с|по|завтра|сегодня|послезавтра|вчера)\s+/i, ' ')
    .trim();
  
  return title || 'Событие';
}

/**
 * Проверяет, является ли событие целым днем
 */
function isAllDayEvent(parsedResult: any, text: string): boolean {
  // Если в результате нет времени, это целый день
  if (!parsedResult.start.knownValues.hour && !parsedResult.start.knownValues.minute) {
    return true;
  }
  
  // Проверяем ключевые слова
  const allDayKeywords = ['весь день', 'целый день', 'на весь день', 'на целый день'];
  const lowerText = text.toLowerCase();
  return allDayKeywords.some(keyword => lowerText.includes(keyword));
}

/**
 * Создает событие по умолчанию (сегодня в 18:00)
 */
function createDefaultEvent(text: string, now: Date): ParsedEventData {
  const today = startOfDay(now);
  const defaultStart = new Date(today);
  defaultStart.setHours(18, 0, 0, 0);
  
  // Если уже прошло 18:00, ставим на завтра
  if (!isAfter(defaultStart, now)) {
    defaultStart.setDate(defaultStart.getDate() + 1);
  }
  
  const defaultEnd = addHours(defaultStart, 1);
  
  return {
    title: text,
    startDate: defaultStart,
    endDate: defaultEnd,
    allDay: false,
  };
}

/**
 * Форматирует дату для отображения в Telegram
 */
export function formatEventDate(date: Date): string {
  return format(date, "d MMMM yyyy 'в' HH:mm", { locale: ru });
}

/**
 * Форматирует событие для отправки в Telegram
 */
export function formatEventMessage(event: ParsedEventData): string {
  const startStr = formatEventDate(event.startDate);
  const endStr = format(event.endDate, "HH:mm", { locale: ru });
  
  if (event.allDay) {
    return `📅 ${event.title}\n🕐 Весь день\n📆 ${format(event.startDate, "d MMMM yyyy", { locale: ru })}`;
  }
  
  return `📅 ${event.title}\n🕐 ${startStr} - ${endStr}`;
}

