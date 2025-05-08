// src/components/EmailInput.jsx
import React from "react";

function EmailInput({ email, setEmail }) {
  return (
    <div className="input-group">
      <label htmlFor="email">
        <i className="fas fa-envelope"></i>
        Email Address
      </label>
      <input
        type="email"
        id="email"
        name="email"
        placeholder="e.g., your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
    </div>
  );
}

export default EmailInput;