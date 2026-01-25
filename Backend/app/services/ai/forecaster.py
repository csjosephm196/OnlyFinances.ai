"""Layer 2: Financial Forecasting Service.

Generates 90-day cash flow projections using:
1. Statistical time-series analysis (moving averages, trend detection)
2. Seasonality detection (day-of-week, monthly patterns)
3. Gemini AI for insight generation

This service uses historical transaction data combined with income statement
and balance sheet context to produce accurate, interpretable forecasts.
"""

import json
import logging
import uuid
from collections import defaultdict
from datetime import datetime, date, timedelta
from typing import Any, Optional

import google.generativeai as genai

from app.core.config import get_settings
from .models import (
    CategorizedTransaction,
    ForecastRequest,
    ForecastResult,
    ForecastDataPoint,
    ForecastMetrics,
    ForecastInsight,
    ForecastInsightType,
    IncomeContext,
    BalanceContext,
)

logger = logging.getLogger(__name__)

# Constants for forecast calculations
FORECAST_DAYS = 90
CONFIDENCE_LEVEL = 0.95
CONFIDENCE_MULTIPLIER = 1.96  # For 95% CI
SMOOTHING_ALPHA = 0.3  # Exponential smoothing factor
MIN_RUNWAY_MONTHS = 3  # Minimum runway for safe-to-spend calculation


async def generate_forecast(request: ForecastRequest) -> ForecastResult:
    """
    Generate a 90-day financial forecast based on historical data.
    
    Args:
        request: ForecastRequest with transactions, income/balance context
        
    Returns:
        ForecastResult with projections, metrics, and AI insights
    """
    logger.info(f"Generating forecast for {len(request.transactions)} transactions")
    
    # Generate unique forecast ID
    forecast_id = f"fc_{uuid.uuid4().hex[:12]}"
    
    # Track data sources
    data_sources = ["transactions"]
    if request.income_context:
        data_sources.append("income_statement")
    if request.balance_context:
        data_sources.append("balance_sheet")
    
    # Step 1: Prepare time series data
    daily_data = _aggregate_daily_cashflow(request.transactions)
    
    if not daily_data:
        # Return empty forecast if no data
        today = date.today()
        return ForecastResult(
            success=False,
            forecast_id=forecast_id,
            generated_at=datetime.now(),
            data_points=[],
            metrics=ForecastMetrics(
                runway_months=0,
                safety_buffer=0,
                avg_daily_revenue=0,
                avg_daily_expense=0,
                avg_daily_net=0,
                projected_end_balance=request.current_balance,
                current_balance=request.current_balance
            ),
            insights=[],
            data_sources=data_sources,
            historical_start=today,
            historical_end=today,
            forecast_end=today + timedelta(days=request.forecast_days)
        )
    
    # Step 2: Calculate historical metrics
    sorted_dates = sorted(daily_data.keys())
    historical_start = sorted_dates[0]
    historical_end = sorted_dates[-1]
    today = date.today()
    
    # Use today as the end point if historical data extends beyond
    effective_end = min(historical_end, today)
    
    # Calculate averages from historical data
    revenues = [daily_data[d]["revenue"] for d in sorted_dates]
    expenses = [daily_data[d]["expense"] for d in sorted_dates]
    
    avg_daily_revenue = sum(revenues) / len(revenues) if revenues else 0
    avg_daily_expense = sum(expenses) / len(expenses) if expenses else 0
    avg_daily_net = avg_daily_revenue - avg_daily_expense
    
    # Adjust averages with income statement data if available
    if request.income_context and request.income_context.total_revenue > 0:
        # Use income statement to refine monthly estimates
        days_span = (historical_end - historical_start).days + 1
        if days_span > 0:
            monthly_income_revenue = request.income_context.total_revenue
            monthly_income_expense = request.income_context.total_expenses
            # Weight the average with income statement data (30% income, 70% transactions)
            avg_daily_revenue = 0.7 * avg_daily_revenue + 0.3 * (monthly_income_revenue / 30)
            avg_daily_expense = 0.7 * avg_daily_expense + 0.3 * (monthly_income_expense / 30)
            avg_daily_net = avg_daily_revenue - avg_daily_expense
    
    # Step 3: Detect seasonality patterns
    seasonality = _detect_seasonality(daily_data)
    
    # Step 4: Calculate variance for confidence intervals
    net_values = [daily_data[d]["revenue"] - daily_data[d]["expense"] for d in sorted_dates]
    variance = _calculate_variance(net_values)
    std_dev = variance ** 0.5 if variance > 0 else abs(avg_daily_net) * 0.2
    
    # Step 5: Generate data points (historical + forecast)
    data_points = []
    running_balance = request.current_balance
    
    # Add historical data points
    for d in sorted_dates:
        if d <= effective_end:
            daily_net = daily_data[d]["revenue"] - daily_data[d]["expense"]
            running_balance += daily_net
            data_points.append(ForecastDataPoint(
                date=d,
                actual=running_balance,
                predicted=None,
                upper_bound=None,
                lower_bound=None,
                cumulative_balance=running_balance
            ))
    
    # Project forward for forecast_days
    forecast_end = effective_end + timedelta(days=request.forecast_days)
    current_date = effective_end + timedelta(days=1)
    
    while current_date <= forecast_end:
        # Apply seasonality adjustment
        day_of_week = current_date.weekday()
        seasonality_factor = seasonality.get(day_of_week, 1.0)
        
        # Calculate projected daily net with seasonality
        projected_net = avg_daily_net * seasonality_factor
        running_balance += projected_net
        
        # Calculate confidence bounds (widening over time)
        days_out = (current_date - effective_end).days
        uncertainty = std_dev * (days_out ** 0.5) * CONFIDENCE_MULTIPLIER
        
        data_points.append(ForecastDataPoint(
            date=current_date,
            actual=None,
            predicted=running_balance,
            upper_bound=running_balance + uncertainty,
            lower_bound=max(0, running_balance - uncertainty),
            cumulative_balance=running_balance
        ))
        
        current_date += timedelta(days=1)
    
    # Step 6: Calculate metrics
    projected_end_balance = running_balance
    
    # Calculate runway (months until balance reaches 0 at current burn rate)
    if avg_daily_net < 0:
        days_runway = request.current_balance / abs(avg_daily_net)
        runway_months = days_runway / 30
    else:
        runway_months = 36  # Cap at 3 years if positive net
    
    # Safety buffer: 3 months of expenses
    safety_buffer = avg_daily_expense * 30 * MIN_RUNWAY_MONTHS
    
    # Use liquid assets from balance context if available
    if request.balance_context and request.balance_context.liquid_assets > 0:
        current_balance_for_calc = request.balance_context.liquid_assets
        if avg_daily_net < 0:
            days_runway = current_balance_for_calc / abs(avg_daily_net)
            runway_months = days_runway / 30
    
    metrics = ForecastMetrics(
        runway_months=round(runway_months, 1),
        safety_buffer=round(safety_buffer, 2),
        avg_daily_revenue=round(avg_daily_revenue, 2),
        avg_daily_expense=round(avg_daily_expense, 2),
        avg_daily_net=round(avg_daily_net, 2),
        projected_end_balance=round(projected_end_balance, 2),
        current_balance=round(request.current_balance, 2)
    )
    
    # Step 7: Generate AI insights
    insights = await _generate_ai_insights(
        metrics=metrics,
        transactions=request.transactions,
        income_context=request.income_context,
        balance_context=request.balance_context,
        seasonality=seasonality
    )
    
    return ForecastResult(
        success=True,
        forecast_id=forecast_id,
        generated_at=datetime.now(),
        data_points=data_points,
        metrics=metrics,
        insights=insights,
        confidence_level=CONFIDENCE_LEVEL,
        data_sources=data_sources,
        historical_start=historical_start,
        historical_end=effective_end,
        forecast_end=forecast_end
    )


def _aggregate_daily_cashflow(
    transactions: list[CategorizedTransaction]
) -> dict[date, dict[str, float]]:
    """
    Aggregate transactions into daily revenue and expense totals.
    
    Returns:
        Dict mapping date to {"revenue": float, "expense": float}
    """
    daily: dict[date, dict[str, float]] = defaultdict(lambda: {"revenue": 0.0, "expense": 0.0})
    
    for txn in transactions:
        # Parse date if it's a string
        if isinstance(txn.date, str):
            try:
                txn_date = datetime.strptime(txn.date, "%Y-%m-%d").date()
            except ValueError:
                continue
        else:
            txn_date = txn.date
        
        if txn.amount > 0:
            daily[txn_date]["revenue"] += txn.amount
        else:
            daily[txn_date]["expense"] += abs(txn.amount)
    
    return dict(daily)


def _detect_seasonality(daily_data: dict[date, dict[str, float]]) -> dict[int, float]:
    """
    Detect day-of-week seasonality patterns.
    
    Returns:
        Dict mapping day_of_week (0=Monday) to multiplier
    """
    day_totals: dict[int, list[float]] = defaultdict(list)
    
    for d, values in daily_data.items():
        net = values["revenue"] - values["expense"]
        day_of_week = d.weekday()
        day_totals[day_of_week].append(net)
    
    # Calculate average for each day
    day_averages: dict[int, float] = {}
    for dow, values in day_totals.items():
        day_averages[dow] = sum(values) / len(values) if values else 0
    
    # Calculate overall average
    all_values = [v for vals in day_totals.values() for v in vals]
    overall_avg = sum(all_values) / len(all_values) if all_values else 1
    
    # Calculate seasonality multipliers
    seasonality: dict[int, float] = {}
    for dow in range(7):
        if dow in day_averages and overall_avg != 0:
            seasonality[dow] = day_averages[dow] / overall_avg
        else:
            seasonality[dow] = 1.0
    
    return seasonality


def _calculate_variance(values: list[float]) -> float:
    """Calculate variance of a list of values."""
    if len(values) < 2:
        return 0.0
    
    mean = sum(values) / len(values)
    squared_diffs = [(v - mean) ** 2 for v in values]
    return sum(squared_diffs) / (len(values) - 1)


async def _generate_ai_insights(
    metrics: ForecastMetrics,
    transactions: list[CategorizedTransaction],
    income_context: Optional[IncomeContext],
    balance_context: Optional[BalanceContext],
    seasonality: dict[int, float]
) -> list[ForecastInsight]:
    """
    Generate AI-powered insights using Gemini.
    
    Returns:
        List of ForecastInsight objects
    """
    from app.core.key_rotation import execute_with_rotation, get_key_manager
    
    key_manager = get_key_manager()
    
    if not key_manager.has_keys:
        logger.warning("No Gemini API keys configured, using fallback insights")
        return _generate_fallback_insights(metrics)
    
    async def _call_gemini() -> list[ForecastInsight]:
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Build context for AI
        context = f"""You are a financial analyst AI generating insights for a cash flow forecast.

## Forecast Metrics:
- Runway: {metrics.runway_months} months
- Safety Buffer: ${metrics.safety_buffer:,.2f}
- Average Daily Revenue: ${metrics.avg_daily_revenue:,.2f}
- Average Daily Expense: ${metrics.avg_daily_expense:,.2f}
- Average Daily Net: ${metrics.avg_daily_net:,.2f}
- Current Balance: ${metrics.current_balance:,.2f}
- Projected End Balance (90 days): ${metrics.projected_end_balance:,.2f}
"""

        if income_context:
            context += f"""
## Income Statement Context:
- Total Revenue: ${income_context.total_revenue:,.2f}
- Total Expenses: ${income_context.total_expenses:,.2f}
- Net Income: ${income_context.net_income:,.2f}
"""

        if balance_context:
            context += f"""
## Balance Sheet Context:
- Liquid Assets: ${balance_context.liquid_assets:,.2f}
- Total Equity: ${balance_context.equity:,.2f}
"""

        # Calculate top spending categories
        category_totals: dict[str, float] = defaultdict(float)
        for txn in transactions:
            if txn.amount < 0:
                category_totals[txn.category.value if hasattr(txn.category, 'value') else str(txn.category)] += abs(txn.amount)
        
        top_categories = sorted(category_totals.items(), key=lambda x: x[1], reverse=True)[:5]
        context += "\n## Top Spending Categories:\n"
        for cat, amount in top_categories:
            context += f"- {cat}: ${amount:,.2f}\n"

        prompt = f"""{context}

Based on this financial data, generate exactly 3 insights as a JSON array. Each insight should be an object with:
- "type": one of "warning", "success", or "info"
- "title": short headline (max 30 chars)
- "description": detailed explanation (max 150 chars)
- "metric_value": optional key metric to highlight

Guidelines:
1. First insight should be about risk or concern (if runway < 12 months, negative net, etc.) OR positive momentum if finances are healthy
2. Second insight should be about trends or patterns
3. Third insight should be actionable (safe to spend amount, savings opportunity, etc.)

Return ONLY the JSON array, no other text."""

        response = await model.generate_content_async(
            prompt,
            generation_config=genai.GenerationConfig(
                temperature=0.7,
                response_mime_type="application/json"
            )
        )
        
        try:
            insights_data = json.loads(response.text.strip())
            insights = []
            for item in insights_data[:3]:
                insight_type = item.get("type", "info").lower()
                if insight_type not in ["warning", "success", "info"]:
                    insight_type = "info"
                
                insights.append(ForecastInsight(
                    type=ForecastInsightType(insight_type),
                    title=item.get("title", "Insight")[:50],
                    description=item.get("description", "")[:200],
                    metric_value=item.get("metric_value")
                ))
            return insights
        except (json.JSONDecodeError, KeyError) as e:
            logger.warning(f"Failed to parse AI insights: {e}")
            return _generate_fallback_insights(metrics)
    
    try:
        return await execute_with_rotation(
            _call_gemini,
            fallback=lambda: _generate_fallback_insights(metrics),
            operation_name="forecast insights generation"
        )
    except Exception as e:
        logger.exception(f"Error generating AI insights: {e}")
        return _generate_fallback_insights(metrics)


def _generate_fallback_insights(metrics: ForecastMetrics) -> list[ForecastInsight]:
    """Generate simple fallback insights when AI is unavailable."""
    insights = []
    
    # Insight 1: Risk or Health
    if metrics.runway_months < 6:
        insights.append(ForecastInsight(
            type=ForecastInsightType.WARNING,
            title="Low Runway Alert",
            description=f"Current runway of {metrics.runway_months} months is below recommended 6-month minimum. Consider reducing expenses.",
            metric_value=f"{metrics.runway_months} months"
        ))
    elif metrics.avg_daily_net > 0:
        insights.append(ForecastInsight(
            type=ForecastInsightType.SUCCESS,
            title="Positive Cash Flow",
            description=f"Averaging ${metrics.avg_daily_net:.2f} net positive daily. Your finances are trending healthy.",
            metric_value=f"+${metrics.avg_daily_net:.2f}/day"
        ))
    else:
        insights.append(ForecastInsight(
            type=ForecastInsightType.WARNING,
            title="Negative Cash Flow",
            description=f"Averaging ${abs(metrics.avg_daily_net):.2f} net negative daily. Monitor spending closely.",
            metric_value=f"-${abs(metrics.avg_daily_net):.2f}/day"
        ))
    
    # Insight 2: Trend
    growth_direction = "growing" if metrics.projected_end_balance > metrics.current_balance else "declining"
    balance_change = metrics.projected_end_balance - metrics.current_balance
    insights.append(ForecastInsight(
        type=ForecastInsightType.SUCCESS if balance_change > 0 else ForecastInsightType.INFO,
        title=f"Balance {growth_direction.title()}",
        description=f"Projected balance of ${metrics.projected_end_balance:,.2f} in 90 days represents a ${abs(balance_change):,.2f} {'increase' if balance_change > 0 else 'decrease'}.",
        metric_value=f"${abs(balance_change):,.2f}"
    ))
    
    # Insight 3: Safe to Spend
    if metrics.avg_daily_net > 0:
        safe_spend = metrics.avg_daily_net * 30 * 0.5  # 50% of monthly surplus
        insights.append(ForecastInsight(
            type=ForecastInsightType.INFO,
            title="Safe to Spend",
            description=f"You can safely deploy up to ${safe_spend:,.2f} this month without impacting your runway.",
            metric_value=f"${safe_spend:,.2f}"
        ))
    else:
        reduce_by = abs(metrics.avg_daily_net) * 30 * 0.3  # 30% reduction target
        insights.append(ForecastInsight(
            type=ForecastInsightType.INFO,
            title="Savings Opportunity",
            description=f"Reducing monthly spending by ${reduce_by:,.2f} would stabilize your cash flow.",
            metric_value=f"${reduce_by:,.2f}"
        ))
    
    return insights
