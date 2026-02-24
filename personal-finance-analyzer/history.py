"""
Хранение истории снимков и расчёт динамики за период.
История сохраняется в data/snapshot_history.json (по умолчанию до 52 записей = ~1 год при еженедельном запуске).
Динамика: тренды по тратам, сбережениям, портфелю, ключевой ставке и курсам.
"""
import json
import logging
import os
from datetime import datetime
from typing import Any

logger = logging.getLogger(__name__)

# Папка данных относительно корня проекта
_PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
DEFAULT_HISTORY_PATH = os.path.join(_PROJECT_ROOT, "data", "snapshot_history.json")
MAX_HISTORY_ENTRIES = 52  # недель при еженедельном запуске


def _summary_from_snapshot(snapshot: dict[str, Any]) -> dict[str, Any]:
    """Из полного snapshot вытащить компактную запись для истории (только числа и ключевые поля)."""
    return {
        "ts": datetime.utcnow().isoformat() + "Z",
        "savings_rate": snapshot.get("savings_rate"),
        "total_income_rub": snapshot.get("income", {}).get("total_rub"),
        "total_expenses_rub": snapshot.get("expenses", {}).get("total_rub"),
        "monthly_expenses_rub": snapshot.get("expenses", {}).get("monthly_rub"),
        "essential_ratio": snapshot.get("expenses", {}).get("essential_ratio"),
        "lifestyle_ratio": snapshot.get("expenses", {}).get("lifestyle_ratio"),
        "optional_ratio": snapshot.get("expenses", {}).get("optional_ratio"),
        "net_worth": snapshot.get("net_worth"),
        "total_assets": snapshot.get("total_assets"),
        "total_liabilities": snapshot.get("total_liabilities"),
        "emergency_fund_months": snapshot.get("emergency_fund_months"),
        "debt_to_income_pct": (snapshot.get("debt") or {}).get("debt_to_income_pct"),
        "allocation": snapshot.get("portfolio", {}).get("allocation"),
        "safe_assets_ratio_pct": snapshot.get("portfolio", {}).get("safe_assets_ratio_pct"),
        "crypto_ratio_pct": snapshot.get("portfolio", {}).get("crypto_ratio_pct"),
        "diversification_score": snapshot.get("portfolio", {}).get("diversification_score"),
        "cbr_rate": (snapshot.get("macro") or {}).get("cbr_rate"),
        "inflation": (snapshot.get("macro") or {}).get("inflation"),
        "rub_usd": (snapshot.get("macro") or {}).get("rub_usd"),
        "rub_eur": (snapshot.get("macro") or {}).get("rub_eur"),
        "btc_usd": (snapshot.get("macro") or {}).get("btc_usd"),
    }
}


def _safe_float(x: Any) -> float | None:
    if x is None:
        return None
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def _trend(values: list[float | None]) -> dict[str, Any] | None:
    """Простой тренд: первый vs последний, изменение в п.п. или %."""
    clean = [v for v in values if v is not None]
    if len(clean) < 2:
        return None
    first, last = clean[0], clean[-1]
    if first == 0:
        return {"first": first, "last": last, "change_pct": None, "direction": "flat" if last == 0 else "up"}
    change_pct = ((last - first) / first) * 100
    return {
        "first": round(first, 2),
        "last": round(last, 2),
        "change_pct": round(change_pct, 1),
        "direction": "up" if change_pct > 0 else "down" if change_pct < 0 else "flat",
    }


def _trend_ratios(records: list[dict], key: str) -> dict[str, Any] | None:
    vals = [_safe_float(r.get(key)) for r in records]
    return _trend(vals)


def save_snapshot_to_history(snapshot: dict[str, Any], history_path: str | None = None) -> None:
    """Добавить текущий снимок в историю и обрезать до MAX_HISTORY_ENTRIES."""
    path = history_path or DEFAULT_HISTORY_PATH
    os.makedirs(os.path.dirname(path), exist_ok=True)
    entry = _summary_from_snapshot(snapshot)
    records = []
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                records = json.load(f)
        except Exception as e:
            logger.warning("Could not load history %s: %s", path, e)
    records.append(entry)
    records = records[-MAX_HISTORY_ENTRIES:]
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(records, f, ensure_ascii=False, indent=0)
    except Exception as e:
        logger.warning("Could not save history %s: %s", path, e)


def load_history(history_path: str | None = None) -> list[dict[str, Any]]:
    """Загрузить список записей истории (от старых к новым)."""
    path = history_path or DEFAULT_HISTORY_PATH
    if not os.path.exists(path):
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.warning("Could not load history %s: %s", path, e)
        return []


def compute_dynamics(
    history: list[dict[str, Any]],
    min_entries: int = 2,
) -> dict[str, Any]:
    """
    По истории записей вычислить динамику за период (тренды).
    Возвращает блок dynamics для snapshot: расходы, сбережения, портфель, макро.
    """
    if len(history) < min_entries:
        return {"available": False, "reason": "not_enough_history", "entries": len(history)}

    # Тренды по числам
    def trend(key: str):
        return _trend_ratios(history, key)

    dynamics = {
        "available": True,
        "entries": len(history),
        "period_description": f"за последние {len(history)} записей (каждая запись — один запуск анализа)",
        "expenses": {
            "total_expenses_rub": trend("total_expenses_rub"),
            "monthly_expenses_rub": trend("monthly_expenses_rub"),
            "essential_ratio": trend("essential_ratio"),
            "lifestyle_ratio": trend("lifestyle_ratio"),
            "optional_ratio": trend("optional_ratio"),
        },
        "savings": {
            "savings_rate": trend("savings_rate"),
            "total_income_rub": trend("total_income_rub"),
        },
        "balance_sheet": {
            "net_worth": trend("net_worth"),
            "total_assets": trend("total_assets"),
            "total_liabilities": trend("total_liabilities"),
            "emergency_fund_months": trend("emergency_fund_months"),
            "debt_to_income_pct": trend("debt_to_income_pct"),
        },
        "portfolio": {
            "safe_assets_ratio_pct": trend("safe_assets_ratio_pct"),
            "crypto_ratio_pct": trend("crypto_ratio_pct"),
            "diversification_score": trend("diversification_score"),
        },
        "macro": {
            "cbr_rate": trend("cbr_rate"),
            "inflation": trend("inflation"),
            "rub_usd": trend("rub_usd"),
            "rub_eur": trend("rub_eur"),
            "btc_usd": trend("btc_usd"),
        },
    }
    # Убрать None тренды для краткости
    def clean(d: dict) -> dict:
        out = {}
        for k, v in d.items():
            if isinstance(v, dict):
                v = clean(v)
                if v:
                    out[k] = v
            elif v is not None:
                out[k] = v
        return out

    return clean(dynamics)
