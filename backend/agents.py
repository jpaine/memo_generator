import os
import sys

# Add error handling for missing dependencies
try:
    from crewai import Agent
    from langchain_openai import ChatOpenAI
    from langchain.tools import Tool
    from crewai_tools import EXASearchTool
except ImportError as e:
    print(f"Error importing required modules: {e}")
    print("Please ensure all dependencies are installed:")
    print("pip install crewai crewai-tools langchain langchain-openai")
    sys.exit(1)

#Portkey, fallback to direct OpenAI if not available
try:
    from portkey_ai import createHeaders, PORTKEY_GATEWAY_URL
    PORTKEY_AVAILABLE = True
except ImportError:
    PORTKEY_AVAILABLE = False
    print("Portkey not available, falling back to direct OpenAI usage")

def get_portkey_llm(trace_id=None, span_id=None, agent_name=None):
    if PORTKEY_AVAILABLE:
        headers = createHeaders(
            provider="openai",
            api_key=os.getenv("PORTKEY_API_KEY"),
            trace_id=trace_id,
        )
        if span_id:
            headers['x-portkey-span-id'] = span_id
        if agent_name:
            headers['x-portkey-span-name'] = f'Agent: {agent_name}'

        return ChatOpenAI(
            model="gpt-4o",
            base_url=PORTKEY_GATEWAY_URL,
            default_headers=headers,
            api_key=os.getenv("OPENAI_API_KEY")
        )
    else:
        # Fallback to direct OpenAI usage
        return ChatOpenAI(
            model="gpt-4o",
            api_key=os.getenv("OPENAI_API_KEY")
        )

# EXA Search tool
class CustomEXASearchTool(EXASearchTool):
    def __init__(self):
        super().__init__(
            type='neural',
            use_autoprompt=True,
            category='company',
            startPublishedDate='2023-01-01T00:00:00.000Z',
            excludeText=[
                'overall AI market', 'general AI industry', 'AI market size globally'
            ],
            numResults=25
        )

exa_search_tool = CustomEXASearchTool()

# Market Size tool
def estimate_market_size(data: str) -> str:
    return f"Estimated market size based on: {data}"

market_size_tool = Tool(
    name="Market Size Estimator",
    func=estimate_market_size,
    description="Estimates market size based on provided data."
)

# CAGR calculator tool
def calculate_cagr(initial_value: float, final_value: float, num_years: int) -> float:
    cagr = (final_value / initial_value) ** (1 / num_years) - 1
    return cagr

cagr_tool = Tool(
    name="CAGR Calculator",
    func=calculate_cagr,
    description="Calculates CAGR given initial value, final value, and number of years."
)

# Agents
def create_agent(role, goal, backstory, tools, trace_id=None, agent_name=None):
    span_id = os.urandom(16).hex() if trace_id else None
    llm = get_portkey_llm(trace_id, span_id, agent_name)

    return Agent(
        role=role,
        goal=goal,
        backstory=backstory,
        tools=tools,
        llm=llm,
        verbose=True,
        allow_delegation=True,
        max_iter=25,
        max_execution_time=300
    )

def get_industry_analyst(trace_id=None):
    return create_agent(
        role='Industry Research Analyst',
        goal='Provide industry background context and identify relevant customer segments for the market opportunity',
        backstory='You are an expert in industry research and segmentation. You are skilled at outlining the historical and future growth of tech sectors and identifying the most relevant customer segments by use case, geography, or firmographics.',
        tools=[exa_search_tool],
        trace_id=trace_id,
        agent_name='industry_analyst'
    )

def get_market_analyst(trace_id=None):
    return create_agent(
        role='Market Size Research Analyst',
        goal='Research TAM for specific subsegment. Find actual revenue data, not AI market percentages.',
        backstory='''Expert at finding granular subsegment market data through:
        - Industry association reports (e.g., SEMI for semiconductors, BioWorld for biotech)
        - Vertical-specific research firms (Gartner for specific tech, IDC for enterprise)
        - Company earnings calls and SEC filings for market size validation
        - Trade publication databases
        Avoids generic "AI market is $X trillion" approaches.''',
        tools=[exa_search_tool, market_size_tool, cagr_tool],
        trace_id=trace_id,
        agent_name='market_analyst'
    )

def get_timing_analyst(trace_id=None):
    return create_agent(
        role='Investment Timing Analyst',
        goal='Evaluate the current investment timing for the market opportunity, considering tech maturity, capital market sentiment, and industry adoption trends. Output an investment timing score from 1 to 5.',
        backstory='You are an expert in identifying emerging investment trends and timing windows in the tech industry. You analyze industry buzz, funding booms, regulatory conditions, and technology hype cycles.',
        tools=[exa_search_tool],
        trace_id=trace_id,
        agent_name='timing_analyst'
    )

def get_regional_analyst(trace_id=None):
    return create_agent(
        role='Regional Investment Risk Analyst',
        goal='Assess key risks of investing in this sector within the US and Southeast Asia. Focus on regulation, competition, tech adoption, and political/economic risks.',
        backstory='You are a cross-regional investment risk analyst with deep understanding of AI sector risks across different geographies.',
        tools=[exa_search_tool],
        trace_id=trace_id,
        agent_name='regional_analyst'
    )


def get_competitor_analyst(trace_id=None):
    return create_agent(
        role='Startup Competitive Intelligence Specialist',
        goal='Map 5+ early-stage competitors with funding details, founding teams, and technology differentiation',
        backstory="""Specialist in pre-IPO competitive landscapes. Tracks:
        - Seed/Series A-C startups via Crunchbase, PitchBook queries
        - Technical differentiation through patent filings, research papers
        - Team backgrounds via LinkedIn, academic publications
        - Product positioning through company blogs, case studies
        - Funding momentum and investor quality assessment
        Focuses on actionable competitive intelligence, not market overviews.""",
        tools=[exa_search_tool],
        trace_id=trace_id,
        agent_name='competitor_analyst'
    )

def get_strategy_advisor(trace_id=None):
    return create_agent(
        role='Research Quality Controller',
        goal='Ensure each analysis delivers specific, actionable data. Reject generic market overviews and demand granular findings.',
        backstory="""Quality controller who rejects surface-level analysis:
        - Market sizing: Demands bottom-up calculations, not top-down percentages
        - Competitive intel: Requires named companies with specific metrics
        - Timing: Needs evidence-based inflection points, not trends
        - Regional: Wants regulatory specifics, not general market conditions
        Iterates until each output has actionable specificity.""",
        tools=[],
        trace_id=trace_id,
        agent_name='strategy_advisor'
    )

def get_decision_analyst(trace_id=None):
    return create_agent(
        role='VC Investment Decision Framework Specialist',
        goal='Apply systematic investment criteria: market size (>$10B TAM), timing (adoption inflection), competitive moat, execution risk',
        backstory='''Senior VC partner with decision framework:
        - Market: TAM >$10B, growing >20% CAGR, timing at adoption inflection
        - Competition: Defensible moat, 2+ year lead time, IP protection
        - Team: Domain expertise, execution track record, market timing
        - Risk: Technical feasibility, regulatory clarity, capital efficiency
        Outputs: Invest (all criteria met), Hold (2-3 criteria), Pass (<2 criteria)''',
        tools=[],
        trace_id=trace_id,
        agent_name='decision_analyst'
    )

__all__ = ['get_industry_analyst', 'get_market_analyst', 'get_competitor_analyst', 'get_strategy_advisor', 'get_timing_analyst', 'get_regional_analyst', 'get_decision_analyst']