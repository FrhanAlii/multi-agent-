from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate

from utils.config import settings
from utils.constants import AgentType
from utils.logging_config import get_logger
from workflows.workflow_states import WorkflowState, build_agent_message

logger = get_logger(__name__)

EXECUTION_PLAN_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are an execution planner for a business process automation system.
Create a concrete execution plan for the approved decision.

Return a JSON object with:
- execution_steps: list of {{step_id, action, description, parameters, estimated_duration, dependencies}}
- total_steps: int
- execution_summary: brief description of what will be executed
- rollback_plan: how to undo the execution if it fails
- notifications: list of {{recipient_role, message_type, when}}
- success_criteria: list of conditions that define successful execution

Respond ONLY with valid JSON."""),
    ("human", """Approved decision:
{decision}

Extracted data:
{extracted_data}

Execute with the following context:
- workflow_id: {workflow_id}
- business_process: {business_process}"""),
])


async def execution_node(state: WorkflowState) -> dict[str, Any]:
    import json
    logger.info("execution_start", workflow_id=state["workflow_id"])

    decision = state.get("decision") or {}
    extracted_data = state.get("extracted_data") or {}
    classification = state.get("document_classification") or {}

    llm = ChatOpenAI(model=settings.llm_model, temperature=0.0, api_key=settings.openai_api_key)
    chain = EXECUTION_PLAN_PROMPT | llm

    try:
        # Step 1: Generate execution plan
        plan_response = await chain.ainvoke({
            "decision": json.dumps(decision, indent=2)[:2000],
            "extracted_data": json.dumps(extracted_data, indent=2)[:2000],
            "workflow_id": state["workflow_id"],
            "business_process": classification.get("business_process", "unknown"),
        })
        execution_plan = json.loads(plan_response.content)

        # Step 2: Execute each step (simulated — replace with real integrations)
        results: list[dict[str, Any]] = []
        errors: list[str] = []

        for step in execution_plan.get("execution_steps", []):
            step_id = step.get("step_id", str(uuid.uuid4())[:8])
            action = step.get("action", "unknown")
            try:
                # TODO: Route to real execution handlers (CRM, ERP, email, etc.)
                step_result = await _execute_step(step, state)
                results.append({"step_id": step_id, "action": action, "status": "success", "result": step_result})
                logger.info("execution_step_complete", step_id=step_id, action=action)
            except Exception as step_error:
                errors.append(f"Step {step_id} ({action}): {step_error}")
                results.append({"step_id": step_id, "action": action, "status": "failed", "error": str(step_error)})
                logger.error("execution_step_failed", step_id=step_id, error=str(step_error))

        success = len(errors) == 0
        execution_result = {
            "execution_id": str(uuid.uuid4()),
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "steps_completed": len(results),
            "steps_failed": len(errors),
            "success": success,
            "step_results": results,
            "errors": errors,
            "execution_plan": execution_plan,
        }

        message = build_agent_message(
            agent=AgentType.EXECUTION.value,
            content=(
                f"Execution {'COMPLETE' if success else 'PARTIAL'}. "
                f"{len(results) - len(errors)}/{len(results)} steps succeeded. "
                f"{'Errors: ' + '; '.join(errors) if errors else ''}"
            ),
            confidence=1.0 if success else 0.5,
        )

        logger.info(
            "execution_complete",
            workflow_id=state["workflow_id"],
            success=success,
            steps=len(results),
            errors=len(errors),
        )

        return {
            "messages": [message],
            "execution_plan": execution_plan,
            "execution_result": execution_result,
            "execution_success": success,
            "current_step": "execution",
            "next_step": None,
            "completed_steps": ["execution"],
        }

    except Exception as e:
        logger.error("execution_failed", error=str(e), workflow_id=state["workflow_id"])
        return {
            "messages": [build_agent_message(
                agent=AgentType.EXECUTION.value,
                content=f"Execution failed: {e}",
                confidence=0.0,
            )],
            "error": str(e),
            "execution_success": False,
            "should_stop": True,
            "completed_steps": ["execution"],
        }


async def _execute_step(step: dict[str, Any], state: WorkflowState) -> dict[str, Any]:
    """
    Placeholder for real execution handlers.
    Replace each action with actual system integrations.
    """
    action = step.get("action", "").lower()

    if "notify" in action or "email" in action:
        # TODO: Integrate with email service
        return {"status": "notification_queued", "action": action}

    if "update" in action or "record" in action:
        # TODO: Integrate with CRM/ERP
        return {"status": "record_updated", "action": action}

    if "approve" in action or "sign" in action:
        # TODO: Integrate with document management
        return {"status": "approval_recorded", "action": action}

    # Default: log and acknowledge
    return {"status": "acknowledged", "action": action, "parameters": step.get("parameters")}
