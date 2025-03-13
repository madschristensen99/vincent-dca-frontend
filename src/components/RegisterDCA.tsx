import React, { useState } from 'react';

interface RegisterDCAProps {
  onSubmit: (amount: number, frequency: string) => void;
  isLoading?: boolean;
}

export function RegisterDCA({ onSubmit, isLoading = false }: RegisterDCAProps) {
  const [amount, setAmount] = useState<string>('');
  const [frequency, setFrequency] = useState<string>('daily');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    onSubmit(parsedAmount, frequency);
  };

  return (
    <form onSubmit={handleSubmit} className="dca-form" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '500px', margin: '0 auto' }}>
      <div className="form-group" style={{ width: '100%', marginBottom: '1rem' }}>
        <label htmlFor="amount" style={{ display: 'block', marginBottom: '0.5rem', textAlign: 'center' }}>DCA Amount (USDC)</label>
        <div className="input-wrapper" style={{ display: 'flex', justifyContent: 'center' }}>
          <span className="input-prefix">$</span>
          <input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="100.00"
            required
            className="form-input with-prefix"
            disabled={isLoading}
            style={{ textAlign: 'center' }}
          />
          <span className="input-suffix">USDC</span>
        </div>
      </div>

      <div className="form-group" style={{ width: '100%', marginBottom: '1.5rem' }}>
        <label htmlFor="frequency" style={{ display: 'block', marginBottom: '0.5rem', textAlign: 'center' }}>Frequency</label>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <select
            id="frequency"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className="form-select"
            disabled={isLoading}
            style={{ width: '100%', maxWidth: '300px', textAlign: 'center' }}
          >
            <option value="test">Every 10 seconds (Test)</option>
            <option value="minute">Every minute</option>
            <option value="hourly">Hourly</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      </div>

      {error && <div className="form-error" style={{ textAlign: 'center', color: 'red', marginBottom: '1rem' }}>{error}</div>}

      <button 
        type="submit" 
        className="submit-btn" 
        disabled={isLoading}
        style={{ padding: '0.75rem 2rem', fontSize: '1rem', fontWeight: 'bold' }}
      >
        {isLoading ? 'Processing...' : 'Start DCA'}
      </button>
    </form>
  );
}