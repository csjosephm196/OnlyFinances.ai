"""API v1 Endpoints.

Routes for all AI service layers with proper error handling and validation.
"""

import logging
from typing import Union

from fastapi import APIRouter, File, UploadFile, HTTPException, status
from fastapi.responses import JSONResponse, StreamingResponse

from app.services.ai import (
    file_processor,
    forecaster,
    advisor,
    stress_tester,
    tax_agent,
    balance_sheet_processor,
    income_statement_processor,
)
from app.services.ai.models import (
    ProcessingResult, 
    ProcessingError,
    ChatRequest,
    ChatResponse,
    BalanceSheetData,
    IncomeStatementData,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1", tags=["v1"])

# Maximum file size: 5MB
MAX_FILE_SIZE = 5 * 1024 * 1024

# Allowed MIME types for CSV
ALLOWED_CONTENT_TYPES = [
    "text/csv",
    "application/csv",
    "application/vnd.ms-excel",  # Sometimes sent for CSV
    "text/plain",  # Some systems send CSV as plain text
]


@router.get("/health")
async def health_check() -> dict:
    """Health check endpoint."""
    return {"status": "healthy", "version": "v1"}


@router.post(
    "/process",
    response_model=ProcessingResult,
    responses={
        400: {"model": ProcessingError, "description": "Invalid file or parsing error"},
        413: {"model": ProcessingError, "description": "File too large"},
        500: {"model": ProcessingError, "description": "Internal processing error"},
    },
    summary="Process Bank CSV File",
    description="""
    Upload a bank statement CSV file to categorize transactions.
    
    The endpoint accepts CSV files with common bank formats and automatically
    detects columns for date, description, and amount.
    
    **Supported CSV formats:**
    - Date columns: date, trans date, transaction date, posted date, etc.
    - Description columns: description, memo, transaction, details, etc.
    - Amount columns: amount, debit, credit, withdrawal, deposit, etc.
    
    **Returns:**
    - Categorized transactions with AI-assigned spending categories
    - Summary totals by category
    - Monthly breakdown for trend analysis
    """,
)
async def process_file_endpoint(
    file: UploadFile = File(
        ...,
        description="Bank statement CSV file to process"
    )
) -> Union[ProcessingResult, JSONResponse]:
    """
    L1: Process uploaded bank CSV file and categorize transactions.
    
    Accepts a CSV file containing bank transaction data.
    Returns categorized transactions with spending summaries.
    """
    # Validate file extension
    if file.filename and not file.filename.lower().endswith('.csv'):
        logger.warning(f"Rejected file with invalid extension: {file.filename}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "error_code": "INVALID_FILE_TYPE",
                "message": "Only CSV files are accepted",
                "details": {"filename": file.filename}
            }
        )
    
    # Read file content
    try:
        content = await file.read()
    except Exception as e:
        logger.error(f"Failed to read uploaded file: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "error_code": "READ_ERROR",
                "message": "Failed to read uploaded file",
                "details": {"error": str(e)}
            }
        )
    
    # Validate file size
    if len(content) > MAX_FILE_SIZE:
        logger.warning(f"Rejected oversized file: {len(content)} bytes")
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={
                "success": False,
                "error_code": "FILE_TOO_LARGE",
                "message": f"File size exceeds {MAX_FILE_SIZE // (1024*1024)}MB limit",
                "details": {"size_bytes": len(content), "max_bytes": MAX_FILE_SIZE}
            }
        )
    
    # Validate file is not empty
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "error_code": "EMPTY_FILE",
                "message": "Uploaded file is empty"
            }
        )
    
    # Process the file
    try:
        result = await file_processor.process_file(
            content, 
            file.content_type or "text/csv"
        )
        logger.info(
            f"Successfully processed {result.total_transactions} transactions "
            f"from {file.filename}"
        )
        return result
        
    except ValueError as e:
        # Parsing or validation errors
        logger.warning(f"CSV parsing error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "error_code": "PARSE_ERROR",
                "message": str(e)
            }
        )
    except Exception as e:
        # Unexpected errors
        logger.exception(f"Unexpected error processing file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error_code": "PROCESSING_ERROR",
                "message": "An unexpected error occurred while processing the file",
                "details": {"error": str(e)}
            }
        )


@router.post("/forecast")
async def forecast_endpoint() -> dict:
    """L2: Generate financial forecasts."""
    return await forecaster.generate_forecast([])


@router.post("/advise")
async def advise_endpoint() -> dict:
    """L3A: Get personalized financial advice (legacy endpoint)."""
    return await advisor.get_advice({})


@router.post(
    "/advisor/chat",
    response_model=ChatResponse,
    responses={
        400: {"model": ProcessingError, "description": "Invalid request"},
        500: {"model": ProcessingError, "description": "Internal processing error"},
    },
    summary="Chat with Financial Advisor",
    description="""
    Send a message to the AI financial advisor and receive personalized advice.
    
    The advisor has a growth-oriented investment philosophy and provides
    actionable financial guidance on topics including:
    - Investment strategy and portfolio allocation
    - Retirement planning (401k, IRA, Roth strategies)
    - Budgeting and expense optimization
    - Debt management and payoff strategies
    - Tax optimization strategies
    
    **Stateless Design**: Send full conversation history in each request.
    The backend does not store session state - the frontend owns conversation state.
    
    **Financial Focus**: Non-financial queries will be politely redirected.
    """,
)
async def advisor_chat_endpoint(request: ChatRequest) -> ChatResponse:
    """
    L3A: Chat with the AI financial advisor.
    
    Accepts a chat message with optional conversation history and financial context.
    Returns personalized financial advice with follow-up suggestions.
    """
    try:
        response = await advisor.chat(request)
        logger.info(
            f"Advisor chat processed - session: {response.session_id}, "
            f"financial: {response.is_financial}"
        )
        return response
        
    except Exception as e:
        logger.exception(f"Advisor chat error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error_code": "ADVISOR_ERROR",
                "message": "An error occurred while processing your request",
                "details": {"error": str(e)}
            }
        )


@router.post("/stress-test")
async def stress_test_endpoint() -> dict:
    """L3B: Run financial stress tests."""
    return await stress_tester.run_stress_test({})


@router.post("/tax-analysis")
async def tax_analysis_endpoint() -> dict:
    """L4: Analyze tax optimization opportunities."""
    return await tax_agent.analyze_tax_options({})


@router.post(
    "/process-balance-sheet",
    response_model=BalanceSheetData,
    responses={
        400: {"model": ProcessingError, "description": "Invalid file or parsing error"},
        413: {"model": ProcessingError, "description": "File too large"},
        500: {"model": ProcessingError, "description": "Internal processing error"},
    },
    summary="Process Balance Sheet CSV File",
    description="""
    Upload a balance sheet CSV file to categorize assets and liabilities.
    
    The endpoint accepts CSV files with balance sheet data and automatically
    detects columns for account name, type, and value.
    
    **Supported CSV formats:**
    - Name columns: account name, name, item, description, etc.
    - Type columns: type, account type, category, classification, etc.
    - Value columns: balance, amount, value, total, debit, credit, etc.
    
    **Returns:**
    - Categorized balance sheet items with AI-assigned categories
    - Summary totals by category for assets and liabilities
    - Calculated equity (assets - liabilities)
    """,
)
async def process_balance_sheet_endpoint(
    file: UploadFile = File(
        ...,
        description="Balance sheet CSV file to process"
    )
) -> Union[BalanceSheetData, JSONResponse]:
    """
    Process uploaded balance sheet CSV and categorize items.
    
    Accepts a CSV file containing balance sheet data.
    Returns categorized items with asset/liability summaries.
    """
    # Validate file extension
    if file.filename and not file.filename.lower().endswith('.csv'):
        logger.warning(f"Rejected file with invalid extension: {file.filename}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "error_code": "INVALID_FILE_TYPE",
                "message": "Only CSV files are accepted",
                "details": {"filename": file.filename}
            }
        )
    
    # Read file content
    try:
        content = await file.read()
    except Exception as e:
        logger.error(f"Failed to read uploaded file: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "error_code": "READ_ERROR",
                "message": "Failed to read uploaded file",
                "details": {"error": str(e)}
            }
        )
    
    # Validate file size
    if len(content) > MAX_FILE_SIZE:
        logger.warning(f"Rejected oversized file: {len(content)} bytes")
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={
                "success": False,
                "error_code": "FILE_TOO_LARGE",
                "message": f"File size exceeds {MAX_FILE_SIZE // (1024*1024)}MB limit",
                "details": {"size_bytes": len(content), "max_bytes": MAX_FILE_SIZE}
            }
        )
    
    # Validate file is not empty
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "error_code": "EMPTY_FILE",
                "message": "Uploaded file is empty"
            }
        )
    
    # Process the file
    try:
        result = await balance_sheet_processor.process_balance_sheet(
            content, 
            file.content_type or "text/csv"
        )
        logger.info(
            f"Successfully processed {result.total_items} balance sheet items "
            f"from {file.filename}"
        )
        return result
        
    except ValueError as e:
        # Parsing or validation errors
        logger.warning(f"Balance sheet parsing error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "error_code": "PARSE_ERROR",
                "message": str(e)
            }
        )
    except Exception as e:
        # Unexpected errors
        logger.exception(f"Unexpected error processing balance sheet: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error_code": "PROCESSING_ERROR",
                "message": "An unexpected error occurred while processing the file",
                "details": {"error": str(e)}
            }
        )


@router.post(
    "/process-income-statement",
    response_model=IncomeStatementData,
    responses={
        400: {"model": ProcessingError, "description": "Invalid file or parsing error"},
        413: {"model": ProcessingError, "description": "File too large"},
        500: {"model": ProcessingError, "description": "Internal processing error"},
    },
    summary="Process Income Statement CSV File",
    description="""
    Upload an income statement CSV file to categorize revenues and expenses.
    
    The endpoint accepts CSV files with income statement data and automatically
    detects columns for description, type, and amount.
    
    **Supported CSV formats:**
    - Description columns: description, line item, item, account, name, etc.
    - Type columns: type, account type, classification, category, etc.
    - Amount columns: amount, value, total, balance, debit, credit, etc.
    
    **Returns:**
    - Categorized income statement items with AI-assigned categories
    - Summary totals by category for revenues and expenses
    - Calculated gross profit and net income
    """,
)
async def process_income_statement_endpoint(
    file: UploadFile = File(
        ...,
        description="Income statement CSV file to process"
    )
) -> Union[IncomeStatementData, JSONResponse]:
    """
    Process uploaded income statement CSV and categorize items.
    
    Accepts a CSV file containing income statement data.
    Returns categorized items with revenue/expense summaries.
    """
    # Validate file extension
    if file.filename and not file.filename.lower().endswith('.csv'):
        logger.warning(f"Rejected file with invalid extension: {file.filename}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "error_code": "INVALID_FILE_TYPE",
                "message": "Only CSV files are accepted",
                "details": {"filename": file.filename}
            }
        )
    
    # Read file content
    try:
        content = await file.read()
    except Exception as e:
        logger.error(f"Failed to read uploaded file: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "error_code": "READ_ERROR",
                "message": "Failed to read uploaded file",
                "details": {"error": str(e)}
            }
        )
    
    # Validate file size
    if len(content) > MAX_FILE_SIZE:
        logger.warning(f"Rejected oversized file: {len(content)} bytes")
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={
                "success": False,
                "error_code": "FILE_TOO_LARGE",
                "message": f"File size exceeds {MAX_FILE_SIZE // (1024*1024)}MB limit",
                "details": {"size_bytes": len(content), "max_bytes": MAX_FILE_SIZE}
            }
        )
    
    # Validate file is not empty
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "error_code": "EMPTY_FILE",
                "message": "Uploaded file is empty"
            }
        )
    
    # Process the file
    try:
        result = await income_statement_processor.process_income_statement(
            content, 
            file.content_type or "text/csv"
        )
        logger.info(
            f"Successfully processed {result.total_items} income statement items "
            f"from {file.filename}"
        )
        return result
        
    except ValueError as e:
        # Parsing or validation errors
        logger.warning(f"Income statement parsing error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "error_code": "PARSE_ERROR",
                "message": str(e)
            }
        )
    except Exception as e:
        # Unexpected errors
        logger.exception(f"Unexpected error processing income statement: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error_code": "PROCESSING_ERROR",
                "message": "An unexpected error occurred while processing the file",
                "details": {"error": str(e)}
            }
        )
