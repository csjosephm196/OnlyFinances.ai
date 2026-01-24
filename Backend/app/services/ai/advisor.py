"""Layer 3A: Financial Advisory Service.

This service provides personalized financial advice and recommendations
based on user's financial situation and goals. Curated for slightly
aggressive/growth-oriented investment philosophy with strict financial focus.
"""

import json
import logging
import uuid
from typing import Any

import google.generativeai as genai

from app.core.config import get_settings
from .models import ChatRequest, ChatResponse, ChatMessage

logger = logging.getLogger(__name__)

# System prompt for the financial advisor - curated for aggressive/growth stance
ADVISOR_SYSTEM_PROMPT = """You are an expert financial advisor AI with a growth-oriented investment philosophy. You provide personalized, actionable financial advice.

## YOUR INVESTMENT PHILOSOPHY (Slightly Aggressive/Growth-Oriented):
- Favor growth over preservation for those with time horizons of 5+ years
- Recommend higher equity allocations (70-90% stocks for younger investors)
- Advocate for index funds and ETFs as core holdings, but open to strategic individual stock positions
- Support calculated risk-taking: "The biggest risk is not taking any risk"
- Encourage maximizing tax-advantaged accounts (401k, IRA, HSA) before taxable
- Push for higher savings rates (20%+ of income) 
- Recommend against excessive cash holdings ("cash is a losing asset over time due to inflation")
- Favor dollar-cost averaging but acknowledge lump-sum historically outperforms
- Support international diversification (20-40% international exposure)
- Open to growth stocks, small-cap tilts, and emerging markets for higher returns

## STRICT RULES - YOU MUST FOLLOW:
1. **FINANCIAL ONLY**: You ONLY discuss financial topics. If asked about non-financial topics, politely redirect:
   "I'm your financial advisor and can only help with money-related questions. What financial topic can I assist you with?"

2. **NO SPECIFIC STOCK PICKS**: Don't recommend buying specific individual stocks by name. Instead, discuss asset classes, sectors, or index funds.

3. **DISCLAIMER**: For major decisions, remind users to consult a licensed financial advisor for their specific situation.

4. **BE DIRECT**: Give clear, actionable advice. Avoid wishy-washy responses. Take a stance.

5. **CONTEXT-AWARE**: If financial context is provided, reference it in your advice.

## TOPICS YOU COVER:
- Investment strategy and portfolio allocation
- Retirement planning (401k, IRA, Roth strategies)
- Budgeting and expense optimization  
- Debt management and payoff strategies
- Tax optimization strategies
- Emergency fund planning
- Real estate investment considerations
- Insurance needs assessment
- Savings goals and strategies
- Credit score improvement
- Business finance for entrepreneurs

## RESPONSE FORMAT:
- Be concise but thorough (2-4 paragraphs typical)
- Use bullet points for action items when appropriate
- Bold **key recommendations**
- End with a clear next step or follow-up question when relevant

Remember: You lean toward growth and calculated risk-taking while remaining responsible. Encourage action over paralysis by analysis."""


# Off-topic detection keywords
NON_FINANCIAL_INDICATORS = [
    "recipe", "cook", "weather", "movie", "music", "sports", "game", 
    "relationship", "dating", "health", "medical", "doctor", "exercise",
    "travel destination", "vacation spot", "restaurant recommendation",
    "programming", "code", "software bug", "homework", "essay"
]


def _is_financial_query(message: str) -> bool:
    """Check if a query is likely financial in nature."""
    message_lower = message.lower()
    
    # Check for obvious non-financial indicators
    for indicator in NON_FINANCIAL_INDICATORS:
        if indicator in message_lower and not any(
            fin_word in message_lower 
            for fin_word in ["cost", "price", "budget", "afford", "money", "pay", "invest", "save"]
        ):
            return False
    
    return True


def _build_context_section(financial_context: Any) -> str:
    """Build a context section from financial data."""
    if not financial_context:
        return ""
    
    sections = ["\n## USER'S FINANCIAL CONTEXT:"]
    
    if financial_context.total_income:
        sections.append(f"- Monthly Income: ${financial_context.total_income:,.2f}")
    if financial_context.total_expenses:
        sections.append(f"- Monthly Expenses: ${financial_context.total_expenses:,.2f}")
    if financial_context.monthly_savings_rate:
        sections.append(f"- Savings Rate: {financial_context.monthly_savings_rate:.1f}%")
    if financial_context.top_categories:
        sections.append("- Top Spending Categories:")
        for cat, amount in list(financial_context.top_categories.items())[:5]:
            sections.append(f"  - {cat}: ${amount:,.2f}")
    if financial_context.goals:
        sections.append(f"- Financial Goals: {', '.join(financial_context.goals)}")
    
    return "\n".join(sections)


def _format_conversation_history(history: list[ChatMessage]) -> list[dict]:
    """Format conversation history for Gemini."""
    formatted = []
    for msg in history[-10:]:  # Keep last 10 messages for context
        role = "user" if msg.role == "user" else "model"
        formatted.append({
            "role": role,
            "parts": [msg.content]
        })
    return formatted


async def chat(request: ChatRequest) -> ChatResponse:
    """
    Process a chat message and return financial advice.
    
    Args:
        request: ChatRequest with message, history, and optional context
        
    Returns:
        ChatResponse with advisor's reply and suggestions
    """
    from app.core.key_rotation import execute_with_rotation, get_key_manager
    
    settings = get_settings()
    
    # Generate session ID if not provided
    session_id = request.session_id or f"sess_{uuid.uuid4().hex[:12]}"
    
    # Check if query is financial
    if not _is_financial_query(request.message):
        return ChatResponse(
            message="I'm your financial advisor and can only help with money-related questions. "
                    "I can assist with investing, budgeting, retirement planning, debt management, "
                    "taxes, and other financial topics. What financial question can I help you with?",
            session_id=session_id,
            suggestions=[
                "How should I start investing?",
                "Help me create a budget",
                "What's the best way to pay off debt?"
            ],
            is_financial=False
        )
    
    key_manager = get_key_manager()
    
    # Check for API keys
    if not key_manager.has_keys:
        logger.warning("No Gemini API keys configured, returning fallback response")
        return ChatResponse(
            message="I'm currently unable to provide personalized advice. "
                    "Please ensure the service is properly configured.",
            session_id=session_id,
            suggestions=["Try again later"],
            is_financial=True
        )
    
    async def _chat_with_ai() -> ChatResponse:
        """Execute the AI chat."""
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Build the full prompt with context
        context_section = _build_context_section(request.financial_context)
        full_system_prompt = ADVISOR_SYSTEM_PROMPT + context_section
        
        # Format conversation history
        history = _format_conversation_history(request.conversation_history)
        
        # Add current message
        history.append({
            "role": "user",
            "parts": [request.message]
        })
        
        # Create chat and send message
        chat_session = model.start_chat(history=history[:-1] if len(history) > 1 else [])
        
        response = await chat_session.send_message_async(
            f"{full_system_prompt}\n\nUser Question: {request.message}",
            generation_config=genai.GenerationConfig(
                temperature=settings.ADVISOR_TEMPERATURE,
                max_output_tokens=1024,
            )
        )
        
        response_text = response.text.strip()
        
        # Generate follow-up suggestions
        suggestions = await _generate_suggestions(model, request.message, response_text)
        
        return ChatResponse(
            message=response_text,
            session_id=session_id,
            suggestions=suggestions,
            is_financial=True
        )
    
    try:
        return await execute_with_rotation(
            _chat_with_ai,
            fallback=lambda: ChatResponse(
                message="I apologize, but I encountered an issue processing your request. "
                        "Please try rephrasing your question or try again shortly.",
                session_id=session_id,
                suggestions=["Try asking again", "Rephrase your question"],
                is_financial=True
            ),
            operation_name="financial advisor chat"
        )
    except Exception as e:
        logger.exception(f"Advisor chat error: {e}")
        return ChatResponse(
            message="I apologize, but I encountered an issue processing your request. "
                    "Please try rephrasing your question or try again shortly.",
            session_id=session_id,
            suggestions=["Try asking again", "Rephrase your question"],
            is_financial=True
        )


async def _generate_suggestions(model, user_message: str, response: str) -> list[str]:
    """Generate follow-up question suggestions."""
    try:
        suggestion_prompt = f"""Based on this financial conversation:
User asked: "{user_message}"
Advisor replied: "{response[:500]}..."

Generate exactly 3 short follow-up questions the user might ask next. 
Return as a JSON array of strings. Keep each under 50 characters.
Example: ["How do I open a Roth IRA?", "What about index funds?", "How much should I save?"]"""

        suggestion_response = await model.generate_content_async(
            suggestion_prompt,
            generation_config=genai.GenerationConfig(
                temperature=0.7,
                response_mime_type="application/json"
            )
        )
        
        suggestions = json.loads(suggestion_response.text.strip())
        if isinstance(suggestions, list) and len(suggestions) >= 1:
            return suggestions[:3]
    except Exception as e:
        logger.debug(f"Failed to generate suggestions: {e}")
    
    # Fallback suggestions
    return [
        "Tell me more about this",
        "What should I do next?",
        "Are there any risks?"
    ]


async def get_advice(
    financial_profile: dict[str, Any],
    goals: list[str] | None = None
) -> dict[str, Any]:
    """
    Legacy endpoint - Generate personalized financial advice.
    
    Args:
        financial_profile: User's current financial situation
        goals: Optional list of financial goals
        
    Returns:
        Personalized recommendations and action items
    """
    # Convert to new chat format for backwards compatibility
    from .models import FinancialContext
    
    context = FinancialContext(
        total_income=financial_profile.get("income"),
        total_expenses=financial_profile.get("expenses"),
        top_categories=financial_profile.get("categories"),
        goals=goals
    )
    
    request = ChatRequest(
        message="Based on my financial profile, what advice do you have for me?",
        financial_context=context
    )
    
    response = await chat(request)
    
    return {
        "status": "success",
        "layer": "L3A",
        "service": "advisor",
        "advice": response.message,
        "suggestions": response.suggestions
    }
