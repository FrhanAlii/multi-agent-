import pytest


@pytest.fixture(autouse=True)
def reset_singletons():
    """Reset module-level singletons between tests."""
    import rag.client_rag.client_rag_manager as crm
    import rag.client_rag.embedding_service as es
    import rag.dual_rag_orchestrator as dro

    crm._client_rag_manager = None
    es._embedding_service = None
    dro._dual_rag = None

    yield

    crm._client_rag_manager = None
    es._embedding_service = None
    dro._dual_rag = None
