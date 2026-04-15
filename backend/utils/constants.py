from enum import Enum


class WorkflowStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    AWAITING_APPROVAL = "awaiting_approval"
    APPROVED = "approved"
    EXECUTING = "executing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ApprovalStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    ESCALATED = "escalated"
    EXPIRED = "expired"


class ApprovalType(str, Enum):
    PROCESS_DECISION = "process_decision"
    COMPLIANCE_OVERRIDE = "compliance_override"
    EXECUTION_CONFIRMATION = "execution_confirmation"
    DATA_CORRECTION = "data_correction"
    ESCALATION = "escalation"


class DocumentStatus(str, Enum):
    UPLOADING = "uploading"
    VALIDATING = "validating"
    PROCESSING = "processing"
    CHUNKING = "chunking"
    EMBEDDING = "embedding"
    READY = "ready"
    FAILED = "failed"
    ARCHIVED = "archived"
    DELETED = "deleted"


class DocumentType(str, Enum):
    PDF = "pdf"
    DOCX = "docx"
    DOC = "doc"
    TXT = "txt"
    CSV = "csv"
    JSON = "json"
    XLSX = "xlsx"
    UNKNOWN = "unknown"


class WorkflowType(str, Enum):
    DOCUMENT_PROCESSING = "document_processing"
    COMPLIANCE_CHECK = "compliance_check"
    DATA_EXTRACTION = "data_extraction"
    PROCESS_AUTOMATION = "process_automation"
    AUDIT_REVIEW = "audit_review"


class AgentType(str, Enum):
    DOCUMENT_INTAKE = "document_intake"
    DATA_EXTRACTION = "data_extraction"
    PROCESS_DECISION = "process_decision"
    COMPLIANCE_CHECKER = "compliance_checker"
    EXECUTION = "execution"
    ORCHESTRATOR = "orchestrator"


class AuditAction(str, Enum):
    DOCUMENT_UPLOAD = "document_upload"
    DOCUMENT_DELETE = "document_delete"
    WORKFLOW_START = "workflow_start"
    WORKFLOW_COMPLETE = "workflow_complete"
    WORKFLOW_FAIL = "workflow_fail"
    APPROVAL_REQUEST = "approval_request"
    APPROVAL_GRANTED = "approval_granted"
    APPROVAL_REJECTED = "approval_rejected"
    EXECUTION_START = "execution_start"
    EXECUTION_COMPLETE = "execution_complete"
    EXECUTION_FAIL = "execution_fail"
    AGENT_DECISION = "agent_decision"
    COMPLIANCE_FLAG = "compliance_flag"
    DATA_ACCESS = "data_access"


# Quality score thresholds
QUALITY_SCORE_EXCELLENT = 90
QUALITY_SCORE_GOOD = 75
QUALITY_SCORE_ACCEPTABLE = 60
QUALITY_SCORE_POOR = 40
QUALITY_SCORE_UNUSABLE = 0

# Confidence thresholds
CONFIDENCE_HIGH = 0.85
CONFIDENCE_MEDIUM = 0.65
CONFIDENCE_LOW = 0.45

# Error messages
ERR_UNAUTHORIZED = "Unauthorized access"
ERR_FORBIDDEN = "Access forbidden — resource belongs to another user"
ERR_NOT_FOUND = "Resource not found"
ERR_INVALID_FILE_TYPE = "Invalid file type"
ERR_FILE_TOO_LARGE = "File exceeds maximum allowed size"
ERR_DUPLICATE_DOCUMENT = "Duplicate document detected"
ERR_WORKFLOW_NOT_FOUND = "Workflow not found"
ERR_APPROVAL_NOT_FOUND = "Approval request not found"
ERR_APPROVAL_ALREADY_RESOLVED = "Approval has already been resolved"
ERR_APPROVAL_EXPIRED = "Approval request has expired"
