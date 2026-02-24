# Интеграция динамики за период

Чтобы система учитывала **динамику** (как менялись траты, сбережения, ключевая ставка, курсы) и давала более умные рекомендации:

## 1. Модуль `history.py`

Уже есть в проекте. Он:
- сохраняет сжатый снимок каждого запуска в `data/snapshot_history.json`;
- по истории считает тренды: первый vs последний показатель за период (расходы, savings_rate, портфель, cbr_rate, rub_usd и т.д.).

## 2. Изменения в `main.py`

**Импорты** — добавить:
```python
from history import save_snapshot_to_history, load_history, compute_dynamics
```

**В функции `_run_analysis`** — после `snapshot = build_snapshot(...)` добавить:
```python
save_snapshot_to_history(snapshot)
history = load_history()
snapshot["dynamics"] = compute_dynamics(history)
```

**В `main()`** — после `snapshot = build_snapshot(...)` добавить те же три строки перед `if args.json`.

## 3. Изменения в `snapshot_builder.py`

В блоке `"macro"` добавить ключ `btc_usd` (для истории и трендов):
```python
"btc_usd": macro_data.get("btc_usd"),
```

## 4. Изменения в `llm_agent.py`

**В `SYSTEM_PROMPT`** — после пункта 4 «Не допускай» добавить абзац:
```
5. Если в данных есть блок dynamics (тренды за период) — используй их:
   - рост/падение нормы сбережений, доли optional трат;
   - изменение ключевой ставки и курсов;
   - динамика доли безопасных активов и крипто.
   Упоминай тренды в Summary и учитывай при рекомендациях (например, растущие optional — усилить совет по контролю трат).
```

**В `build_user_message`** — ничего менять не нужно: snapshot уже будет содержать `dynamics`, он попадёт в JSON для LLM.

## 5. Поведение

- **Первый запуск:** истории нет, `dynamics.available = false`, LLM получает только текущий снимок.
- **После 2+ запусков:** в snapshot появляется `dynamics` с трендами; LLM видит, как менялись показатели, и может давать рекомендации с учётом динамики.

Файл истории: `personal-finance-analyzer/data/snapshot_history.json` (создаётся автоматически, до 52 записей).
