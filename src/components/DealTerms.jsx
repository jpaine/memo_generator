// src/components/DealTerms.jsx
import React from "react";

function DealTerms({
  currentRound,
  setCurrentRound,
  proposedValuation,
  setProposedValuation,
  valuationDate,
  setValuationDate,
}) {
  const formatNumberWithCommas = (value) => {
    let val = value.replace(/,/g, "").replace(/\D/g, "");
    if (val.length > 3) {
      val = val.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    return val;
  };

  const handleCurrentRoundChange = (e) => {
    setCurrentRound(formatNumberWithCommas(e.target.value));
  };

  const handleProposedValuationChange = (e) => {
    setProposedValuation(formatNumberWithCommas(e.target.value));
  };

  const handleValuationDateChange = (e) => {
    setValuationDate(e.target.value);
  };

  return (
    <>
      <div className="input-row">
        <div className="input-group">
          <label htmlFor="currentRound">
            <i className="fas fa-dollar-sign"></i>
            Current Funding Round
          </label>
          <input
            type="text"
            id="currentRound"
            name="currentRound"
            placeholder="e.g., 1,000,000"
            value={currentRound}
            onChange={handleCurrentRoundChange}
            // Remove required attribute
          />
        </div>

        <div className="input-group">
          <label htmlFor="proposedValuation">
            <i className="fas fa-chart-line"></i>
            Proposed Valuation
          </label>
          <input
            type="text"
            id="proposedValuation"
            name="proposedValuation"
            placeholder="e.g., 10,000,000"
            value={proposedValuation}
            onChange={handleProposedValuationChange}
            // Remove required attribute
          />
        </div>
      </div>

      <div className="input-group">
        <label htmlFor="valuationDate">
          <i className="fas fa-calendar"></i>
          Analysis Date
        </label>
        <input
          type="date"
          id="valuationDate"
          name="valuationDate"
          value={valuationDate}
          onChange={handleValuationDateChange}
          required // Keep this field required if needed
        />
      </div>
    </>
  );
}

export default DealTerms;
