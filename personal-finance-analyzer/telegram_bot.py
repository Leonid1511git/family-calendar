"""
Telegram-бот: запуск расчётов по команде.
Команды: /start — подсказка, /report — быстрый отчёт, /deep_analysis — развёрнутый анализ.
Запуск: python telegram_bot.py (держи процесс запущенным, затем пиши боту в Telegram).
"""
import asyncio
import logging
import os

import dotenv
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes

from main import _run_analysis

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

HELP_TEXT = """Команды для запуска расчётов:

/report — быстрый отчёт (таблица + макро + метрики + рекомендации)
/deep_analysis — развёрнутый анализ (то же, с акцентом на детали)

Отчёт придёт сюда в чат. Расчёт занимает 10–30 сек."""


async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Показать доступные команды."""
    await update.message.reply_text(HELP_TEXT)


async def cmd_report(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Быстрый отчёт: запуск расчётов по команде."""
    await update.message.reply_text("Формирую отчёт…")
    try:
        report = await asyncio.to_thread(_run_analysis, deep=False)
        if len(report) > 4000:
            report = report[:3997] + "\n…"
        # Без parse_mode: в отчёте LLM бывают _ * ` — Telegram ломает разбор Markdown
        await update.message.reply_text(report)
    except Exception as e:
        logger.exception("Report failed: %s", e)
        await update.message.reply_text(f"Ошибка: {e}")


async def cmd_deep(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Глубокий анализ: запуск расчётов по команде."""
    await update.message.reply_text("Запускаю глубокий анализ…")
    try:
        report = await asyncio.to_thread(_run_analysis, deep=True)
        if len(report) > 4000:
            for i in range(0, len(report), 4000):
                await update.message.reply_text(report[i : i + 4000])
        else:
            await update.message.reply_text(report)
    except Exception as e:
        logger.exception("Deep analysis failed: %s", e)
        await update.message.reply_text(f"Ошибка: {e}")


def main() -> None:
    _root = os.path.dirname(os.path.abspath(__file__))
    dotenv.load_dotenv(os.path.join(_root, ".env"))
    token = os.getenv("TELEGRAM_BOT_TOKEN") or os.getenv("EXPO_PUBLIC_TELEGRAM_BOT_TOKEN")
    if not token or token.strip() in ("", "your_bot_token"):
        raise SystemExit(
            "TELEGRAM_BOT_TOKEN не задан. "
            f"Добавь токен от @BotFather в {os.path.join(_root, '.env')}"
        )
    app = Application.builder().token(token.strip()).build()
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("report", cmd_report))
    app.add_handler(CommandHandler("deep_analysis", cmd_deep))
    logger.info("Bot running. Commands: /start, /report, /deep_analysis")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
