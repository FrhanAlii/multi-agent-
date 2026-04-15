# Re-export from logging_config to match spec naming while avoiding
# stdlib shadowing inside the implementation file itself.
from utils.logging_config import setup_logging, get_logger

__all__ = ["setup_logging", "get_logger"]
