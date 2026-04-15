from typing import TypedDict, Annotated
import operator
import os

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
from langgraph.graph import StateGraph, END


class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], operator.add]


def llm_node(state: AgentState) -> AgentState:
    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.7,
        api_key=os.getenv("OPENAI_API_KEY"),
    )
    response = llm.invoke(state["messages"])
    return {"messages": [response]}


def build_graph() -> StateGraph:
    graph = StateGraph(AgentState)

    graph.add_node("llm", llm_node)

    graph.set_entry_point("llm")
    graph.add_edge("llm", END)

    return graph.compile()


_graph = build_graph()


async def run_agent(message: str, session_id: str | None = None) -> str:
    result = _graph.invoke({"messages": [HumanMessage(content=message)]})
    last_message = result["messages"][-1]
    return last_message.content

