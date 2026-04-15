import os
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser


EMAIL_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are an expert outreach copywriter. Write professional, personalized "
        "cold outreach emails that are concise, compelling, and action-oriented.",
    ),
    (
        "human",
        "Write an outreach email to {recipient_name} at {company}.\n"
        "Context about their company: {company_context}\n"
        "Goal of the outreach: {goal}",
    ),
])


def build_email_chain():
    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.7,
        api_key=os.getenv("OPENAI_API_KEY"),
    )
    return EMAIL_PROMPT | llm | StrOutputParser()


def generate_email(
    recipient_name: str,
    company: str,
    company_context: str,
    goal: str,
) -> str:
    chain = build_email_chain()
    return chain.invoke({
        "recipient_name": recipient_name,
        "company": company,
        "company_context": company_context,
        "goal": goal,
    })
