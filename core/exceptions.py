"""
core/exceptions.py
==================
Custom exception handler so all API errors return consistent JSON.
"""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    """
    Wraps DRF's default handler and normalises error responses to:

        {
            "success": false,
            "error": {
                "code": "HTTP_STATUS_CODE",
                "message": "human-readable summary",
                "detail": <original DRF detail>
            }
        }
    """
    response = exception_handler(exc, context)

    if response is not None:
        original_detail = response.data

        # Flatten single-key {"detail": ...} into a plain string
        if isinstance(original_detail, dict) and "detail" in original_detail and len(original_detail) == 1:
            message = str(original_detail["detail"])
        elif isinstance(original_detail, list):
            message = "; ".join(str(e) for e in original_detail)
        elif isinstance(original_detail, str):
            message = original_detail
        else:
            message = "An error occurred."

        response.data = {
            "success": False,
            "error": {
                "code": response.status_code,
                "message": message,
                "detail": original_detail,
            },
        }

    return response


class ServiceError(Exception):
    """
    Raised inside service classes for expected business-logic failures.
    Views should catch this and return HTTP 400.
    """
    def __init__(self, message: str, code: str = "SERVICE_ERROR"):
        self.message = message
        self.code = code
        super().__init__(message)


class PermissionDeniedError(Exception):
    """Raised when a user tries an action outside their role scope."""
    def __init__(self, message: str = "You do not have permission for this action."):
        self.message = message
        super().__init__(message)
