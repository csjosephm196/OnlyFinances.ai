"""Gemini API key rotation manager with automatic failover.

This module provides automatic key rotation when API quota is exhausted,
cycling through multiple keys to maximize availability.
"""

import logging
from typing import Callable, TypeVar, Any
from functools import wraps

import google.generativeai as genai
from google.api_core import exceptions as google_exceptions

from app.core.config import get_settings

logger = logging.getLogger(__name__)

T = TypeVar('T')


class GeminiKeyManager:
    """Manages multiple Gemini API keys with automatic rotation on quota errors."""
    
    _instance = None
    _initialized = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if GeminiKeyManager._initialized:
            return
        
        settings = get_settings()
        keys_str = settings.GEMINI_API_KEYS.strip()
        
        if keys_str:
            self._keys = [k.strip() for k in keys_str.split(",") if k.strip()]
        else:
            self._keys = []
        
        self._current_index = 0
        self._exhausted_keys: set[int] = set()
        
        if self._keys:
            logger.info(f"Initialized GeminiKeyManager with {len(self._keys)} API keys")
        else:
            logger.warning("No Gemini API keys configured")
        
        GeminiKeyManager._initialized = True
    
    @property
    def has_keys(self) -> bool:
        """Check if any keys are available."""
        return len(self._keys) > 0
    
    @property
    def all_exhausted(self) -> bool:
        """Check if all keys have been exhausted."""
        return len(self._exhausted_keys) >= len(self._keys)
    
    def get_current_key(self) -> str | None:
        """Get the current active API key."""
        if not self._keys:
            return None
        return self._keys[self._current_index]
    
    def rotate_to_next(self) -> bool:
        """
        Rotate to the next available key.
        
        Returns:
            True if successfully rotated to a new key, False if all keys exhausted.
        """
        if not self._keys:
            return False
        
        # Mark current key as exhausted
        self._exhausted_keys.add(self._current_index)
        
        # Try to find a non-exhausted key
        for _ in range(len(self._keys)):
            self._current_index = (self._current_index + 1) % len(self._keys)
            if self._current_index not in self._exhausted_keys:
                logger.info(f"Rotated to API key {self._current_index + 1}/{len(self._keys)}")
                return True
        
        logger.error("All Gemini API keys have been exhausted")
        return False
    
    def reset_exhausted(self):
        """Reset exhausted keys (e.g., at start of new day/period)."""
        self._exhausted_keys.clear()
        logger.info("Reset all API key exhaustion states")
    
    def configure_genai(self) -> bool:
        """Configure genai with the current API key."""
        key = self.get_current_key()
        if not key:
            return False
        genai.configure(api_key=key)
        return True


# Global singleton instance
_key_manager: GeminiKeyManager | None = None


def get_key_manager() -> GeminiKeyManager:
    """Get the global key manager instance."""
    global _key_manager
    if _key_manager is None:
        _key_manager = GeminiKeyManager()
    return _key_manager


def is_quota_error(error: Exception) -> bool:
    """Check if an error is a quota/rate limit error that warrants key rotation."""
    error_str = str(error).lower()
    
    # Check for common quota/rate limit indicators
    quota_indicators = [
        "quota",
        "rate limit",
        "resource exhausted",
        "429",
        "too many requests",
        "exceeded",
    ]
    
    for indicator in quota_indicators:
        if indicator in error_str:
            return True
    
    # Check for Google API specific exceptions
    if isinstance(error, google_exceptions.ResourceExhausted):
        return True
    if isinstance(error, google_exceptions.TooManyRequests):
        return True
    
    return False


async def execute_with_rotation(
    operation: Callable[[], T],
    fallback: Callable[[], T] | None = None,
    operation_name: str = "Gemini API call"
) -> T:
    """
    Execute an async operation with automatic API key rotation on quota errors.
    
    Args:
        operation: Async callable that uses the Gemini API
        fallback: Optional fallback function if all keys are exhausted
        operation_name: Name of the operation for logging
        
    Returns:
        Result of the operation or fallback
        
    Raises:
        Exception: If operation fails and no fallback is provided
    """
    key_manager = get_key_manager()
    
    if not key_manager.has_keys:
        logger.warning(f"No API keys available for {operation_name}")
        if fallback:
            return fallback()
        raise ValueError("No Gemini API keys configured")
    
    last_error: Exception | None = None
    
    # Try each key until one works or all are exhausted
    while not key_manager.all_exhausted:
        if not key_manager.configure_genai():
            break
        
        try:
            result = await operation()
            return result
        except Exception as e:
            last_error = e
            
            if is_quota_error(e):
                logger.warning(
                    f"Quota exceeded for key {key_manager._current_index + 1}, "
                    f"rotating to next key: {e}"
                )
                if not key_manager.rotate_to_next():
                    break  # All keys exhausted
            else:
                # Non-quota error, don't rotate
                raise
    
    # All keys exhausted
    logger.error(f"All API keys exhausted for {operation_name}")
    
    if fallback:
        logger.info(f"Using fallback for {operation_name}")
        return fallback()
    
    if last_error:
        raise last_error
    raise RuntimeError("All Gemini API keys exhausted")
