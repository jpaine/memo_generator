import sys
import json
import os

# Validate environment before importing
required_env_vars = ['OPENAI_API_KEY', 'EXA_API_KEY']
missing_vars = [var for var in required_env_vars if not os.getenv(var)]

if missing_vars:
    print(f"Error: Missing required environment variables: {', '.join(missing_vars)}")
    sys.exit(1)

try:
    from crewai import Crew, Task, Process
    from dotenv import load_dotenv
    from agents import get_market_analyst, get_competitor_analyst, get_strategy_advisor, get_timing_analyst, get_regional_analyst, get_decision_analyst, get_industry_analyst
except ImportError as e:
    print(f"Error importing required modules: {e}")
    print("Please ensure all dependencies are installed:")
    print("pip install crewai==0.83.1 crewai-tools==0.20.0 langchain==0.3.14 langchain-openai==0.2.14")
    sys.exit(1)

# Load environment variables
load_dotenv()

def run_analysis(market_opportunity, trace_id):
    print(f"Analyzing market opportunity: {market_opportunity}")

    # Initialize agents with trace_id
    industry_analyst = get_industry_analyst(trace_id)
    market_analyst = get_market_analyst(trace_id)
    competitor_analyst = get_competitor_analyst(trace_id)
    strategy_advisor = get_strategy_advisor(trace_id)
    timing_analyst = get_timing_analyst(trace_id)
    regional_analyst = get_regional_analyst(trace_id)
    decision_analyst = get_decision_analyst(trace_id)

    # Define tasks using initialized agents
    industry_task = Task(
        description=f"""Analyze the industry context and customer segments for the market of {market_opportunity}.
        1. Outline the growth potential of the industry and its relevance to regions such as the US and Southeast Asia.
        2. Identify and describe the primary customer segments the company targets. Consider segmentation by industry vertical, company size, or use case.
        Provide examples and justification for each segment.""",
        expected_output="""An industry and customer analysis including:
        1. Industry growth outlook and key trends
        2. Regional relevance in US and SEA
        3. Defined primary customer segments with reasoning and examples""",
        agent=industry_analyst,
        async_execution=False
    )

    market_task = Task(
        description=f"""Research TAM and growth rate for {market_opportunity} subsegment in US and Southeast Asia.
        
        Methodology:
        1. Find industry-specific market research (not generic AI market data)
        2. Search for company earnings calls mentioning market size
        3. Look for vertical trade associations with market data
        4. Calculate bottom-up TAM from customer segments and pricing
        
        Deliverables:
        - Current market size in USD with specific year
        - 5-year CAGR with supporting data points
        - Number of potential enterprise customers by segment
        - Geographic breakdown (US vs SEA markets)""",
        expected_output="""Market analysis with:
        1. TAM in USD with calculation methodology
        2. CAGR with 3+ data points supporting the trend
        3. Customer count by segment (enterprise, mid-market, SMB)
        4. Geographic market size breakdown
        5. Data sources and confidence level""",
        agent=market_analyst,
        async_execution=False
    )

    timing_task = Task(
        description=f"Analyze whether this is a good time to invest in the {market_opportunity}. Consider adoption trends, industry cycles, funding activity, and maturity. Output an investment timing score from 1 to 5 and a justification.",
        expected_output="A timing analysis with clear reasoning and a timing score (1-5).",
        agent=timing_analyst,
        async_execution=False
    )

    regionalinvestment_task = Task(
        description=f"""Analyze regulatory and market entry risks for {market_opportunity} in US and Southeast Asia.
        
        US Analysis:
        - Federal regulations (FDA, FTC, SEC) specific to this sector
        - State-level variations (CA privacy laws, TX energy regs, etc.)
        - Tax incentives (R&D credits, manufacturing incentives)
        
        SEA Analysis:
        - Singapore: MAS fintech regs, Smart Nation initiatives
        - Indonesia: Digital economy regulations, local partnership requirements  
        - Vietnam: Foreign investment caps, technology transfer requirements
        - Thailand: BOI investment incentives, data localization
        
        Provide specific regulatory hurdles and compliance costs.""",
        expected_output="""Regional risk assessment with:
        1. Specific regulations by jurisdiction with compliance requirements
        2. Compliance timeline and estimated costs
        3. Market entry barriers and partnership requirements
        4. Available investment incentives and tax benefits
        5. Regulatory risk rating (1-5) for each region""",
        agent=regional_analyst,
        async_execution=False
    )

    competitor_task = Task(
        description=f"""Conduct a comprehensive competitive landscape analysis for {market_opportunity}.
        1. Identify 3–5 direct competitors in the same market. For each, include:
           - Company name
           - Website (if available)
           - Product description
           - Traction (e.g., user base, revenue, partnerships)
           - Funding history: round type, amount, investors
        2. Analyze how the company (World Labs) differentiates from these competitors in terms of product, tech, positioning, or GTM.
        3. Identify comparable companies globally with similar business models or go-to-market strategies, especially those with proven success or scale.
        4. List any notable public IPOs or M&A deals in the industry. Mention acquirer, exit value, and company background to benchmark potential exits.
        Use clear structure and provide real names and links if available. Avoid general terms or vague descriptions.
        """,
        expected_output="""A structured competitive landscape analysis that includes:
        1. Detailed profiles of 3–5 key competitors with funding and product info
        2. Analysis of the target company’s positioning and competitive advantages
        3. At least 2 comparable companies globally with business similarities
        4. At least 2 public IPO or M&A events with context and exit values
        """,
        agent=competitor_analyst,
        async_execution=True
    )

    decision_task = Task(
        description="""Apply VC investment framework to synthesize all analyses:
        
        Market Criteria (Weight: 40%):
        - TAM >$10B and growing >20% CAGR = Strong
        - TAM $5-10B and growing >15% CAGR = Moderate  
        - TAM <$5B or growth <15% CAGR = Weak
        
        Timing Criteria (Weight: 25%):
        - Adoption inflection point with regulatory tailwinds = Strong
        - Early adoption phase with some market validation = Moderate
        - Too early or saturated market = Weak
        
        Competition Criteria (Weight: 25%):
        - Clear differentiation with IP protection = Strong
        - Some differentiation, competitive advantages = Moderate
        - Commoditized market with weak moats = Weak
        
        Risk Criteria (Weight: 10%):
        - Low regulatory/execution risk = Strong
        - Moderate regulatory/execution risk = Moderate
        - High regulatory/execution risk = Weak
        
        Final Decision: Invest (3+ Strong criteria), Hold (2 Strong + others Moderate), Pass (otherwise)""",
        expected_output="""Investment recommendation with:
        1. Scoring breakdown by criteria (Market, Timing, Competition, Risk)
        2. Final decision: INVEST / HOLD / PASS
        3. Key supporting rationale (2-3 sentences)
        4. Deal-breaker risks or catalysts""",
        agent=decision_analyst,
        async_execution=False
    )


    # Create the crew
    crew = Crew(
        agents=[industry_analyst, market_analyst, competitor_analyst, timing_analyst, regional_analyst, decision_analyst],
        tasks=[industry_task, market_task, competitor_task, timing_task, regionalinvestment_task, decision_task],
        verbose=True,
        process=Process.hierarchical,
        manager_agent=strategy_advisor,
        planning=True,
    )

    print("Crew created, starting analysis...")
    result = crew.kickoff()
    print("Analysis completed")
    return result

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Please provide the market opportunity and trace ID as arguments.")
        sys.exit(1)

    market_opportunity = sys.argv[1]
    trace_id = sys.argv[2]

    result = run_analysis(market_opportunity, trace_id)

    # Access task outputs
    industry_analysis_output = result.tasks_output[0].raw
    market_analysis_output = result.tasks_output[1].raw
    competitor_analysis_output = result.tasks_output[2].raw
    timing_analysis_output = result.tasks_output[3].raw
    regional_analysis_output = result.tasks_output[4].raw
    decision_output = result.tasks_output[5].raw
    

    # Prepare the final output
    output = {
        "industry_analysis": industry_analysis_output,
        "market_analysis": market_analysis_output,
        "competitor_analysis": competitor_analysis_output,
        "timing_analysis": timing_analysis_output,
        "regional_analysis": regional_analysis_output,
        "decision": decision_output,
        "trace_id": trace_id
    }

    print("Final output:", json.dumps(output, indent=2))