import React from "react";

function FounderInfo({
  founderCount,
  setFounderCount,
  maxFounders,
  linkedInUrls,
  setLinkedInUrls,
}) {
  const handleAddFounder = () => {
    if (founderCount < maxFounders) {
      setFounderCount(founderCount + 1);
      setLinkedInUrls([...linkedInUrls, ""]);
    }
  };

  const handleLinkedInUrlChange = (index, value) => {
    const newUrls = [...linkedInUrls];
    newUrls[index] = value;
    setLinkedInUrls(newUrls);
  };

  return (
    <div className="input-group">
      <label>
        <i className="fas fa-users"></i>
        Founder Information (Founder Linkedin URLs)
      </label>
      {linkedInUrls.map((url, index) => (
        <input
          key={index}
          type="url"
          placeholder={`Founder ${index + 1} LinkedIn URL`}
          value={url}
          onChange={(e) => handleLinkedInUrlChange(index, e.target.value)}
        />
      ))}
      {founderCount < maxFounders && (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleAddFounder}
        >
          Add Another Founder
        </button>
      )}
    </div>
  );
}

export default FounderInfo;
