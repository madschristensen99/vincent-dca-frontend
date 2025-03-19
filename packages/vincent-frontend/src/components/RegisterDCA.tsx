import React, { useState, useEffect } from 'react';

interface Memecoin {
  uuid: string;
  symbol: string;
  name: string;
  iconUrl: string;
  price: string;
  change: string;
  rank: number;
  marketCap: string;
  contractAddress?: string;
}

interface RegisterDCAProps {
  onSubmit: (amount: number, frequency: string, tokenInfo: Memecoin | null) => void;
  isLoading?: boolean;
}

export function RegisterDCA({ onSubmit, isLoading = false }: RegisterDCAProps) {
  const [amount, setAmount] = useState<string>('');
  const [frequency, setFrequency] = useState<string>('daily');
  const [error, setError] = useState<string | null>(null);
  
  // State for top memecoin
  const [topMemecoin, setTopMemecoin] = useState<Memecoin | null>(null);
  const [isLoadingMemecoin, setIsLoadingMemecoin] = useState(false);
  const [memecoinError, setMemecoinError] = useState<string | null>(null);
  
  // Fetch top memecoin when component mounts
  useEffect(() => {
    fetchTopMemecoin();
  }, []);
  
  // Function to fetch top memecoin from Coinranking API
  const fetchTopMemecoin = async () => {
    try {
      setIsLoadingMemecoin(true);
      setMemecoinError(null);
      
      console.log('Fetching top memecoin from Coinranking API');
      
      const response = await fetch('https://api.coinranking.com/v2/coins?blockchains[]=base&tags[]=meme', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch top memecoin: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.data && data.data.coins && data.data.coins.length > 0) {
        const coin = data.data.coins[0];
        
        setTopMemecoin({
          uuid: coin.uuid,
          symbol: coin.symbol,
          name: coin.name,
          iconUrl: coin.iconUrl,
          price: coin.price,
          change: coin.change,
          rank: coin.rank,
          marketCap: coin.marketCap,
          contractAddress: coin.contractAddress
        });
        
        console.log('Top memecoin:', coin.name);
      } else {
        setMemecoinError('No memecoins found on Base');
      }
      
      setIsLoadingMemecoin(false);
    } catch (err: any) {
      console.error('Error fetching top memecoin:', err);
      setMemecoinError(`Failed to fetch top memecoin: ${err.message}`);
      setIsLoadingMemecoin(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    onSubmit(parsedAmount, frequency, topMemecoin);
  };

  // Function to format price with appropriate decimals
  const formatPrice = (price: string) => {
    const numPrice = parseFloat(price);
    if (numPrice < 0.01) {
      return numPrice.toFixed(6);
    } else if (numPrice < 1) {
      return numPrice.toFixed(4);
    } else {
      return numPrice.toFixed(2);
    }
  };
  
  // Function to format market cap
  const formatMarketCap = (marketCap: string) => {
    const num = parseFloat(marketCap);
    if (num >= 1000000000) {
      return `$${(num / 1000000000).toFixed(2)}B`;
    } else if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(2)}M`;
    } else if (num >= 1000) {
      return `$${(num / 1000).toFixed(2)}K`;
    } else {
      return `$${num.toFixed(2)}`;
    }
  };

  return (
    <div>
      {/* Top Memecoin Card */}
      <div style={{
        backgroundColor: '#fffbe6',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
        border: '1px solid #ffe58f',
        maxWidth: '500px',
        margin: '0 auto 24px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#d48806',
            margin: 0
          }}>Top Base Memecoin</h3>
          
          <button
            style={{
              backgroundColor: '#f0f0f0',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '12px',
              color: '#555',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
            onClick={fetchTopMemecoin}
            disabled={isLoadingMemecoin}
            type="button"
          >
            {isLoadingMemecoin ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        
        {isLoadingMemecoin ? (
          <div style={{
            padding: '20px',
            textAlign: 'center',
            color: '#8c8c8c'
          }}>
            Loading top memecoin...
          </div>
        ) : memecoinError ? (
          <div style={{
            backgroundColor: '#fff1f0',
            color: '#ff4d4f',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '16px'
          }}>
            <span role="img" aria-label="Error">⚠️</span> {memecoinError}
          </div>
        ) : topMemecoin ? (
          <>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px'
            }}>
              {topMemecoin.iconUrl && (
                <img 
                  src={topMemecoin.iconUrl} 
                  alt={topMemecoin.name} 
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    objectFit: 'cover'
                  }}
                />
              )}
              <div>
                <div style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#262626'
                }}>
                  {topMemecoin.name} ({topMemecoin.symbol})
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#8c8c8c'
                }}>
                  Rank #{topMemecoin.rank}
                </div>
              </div>
            </div>
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '14px'
              }}>
                <span style={{
                  color: '#8c8c8c'
                }}>Price:</span>
                <span style={{
                  fontWeight: '500',
                  color: '#262626'
                }}>${formatPrice(topMemecoin.price)}</span>
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '14px'
              }}>
                <span style={{
                  color: '#8c8c8c'
                }}>24h Change:</span>
                <span style={{
                  fontWeight: 'bold',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  backgroundColor: parseFloat(topMemecoin.change) >= 0 ? '#f6ffed' : '#fff1f0',
                  color: parseFloat(topMemecoin.change) >= 0 ? '#52c41a' : '#ff4d4f'
                }}>
                  {parseFloat(topMemecoin.change) >= 0 ? '+' : ''}{topMemecoin.change}%
                </span>
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '14px'
              }}>
                <span style={{
                  color: '#8c8c8c'
                }}>Market Cap:</span>
                <span style={{
                  fontWeight: '500',
                  color: '#262626'
                }}>{formatMarketCap(topMemecoin.marketCap)}</span>
              </div>
            </div>
            
            <div style={{
              backgroundColor: '#fff7e6',
              borderRadius: '8px',
              padding: '12px',
              marginTop: '16px',
              fontSize: '14px',
              color: '#d46b08',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span role="img" aria-label="Info">ℹ️</span> Your DCA will automatically purchase {topMemecoin.symbol} on your schedule
            </div>
          </>
        ) : (
          <div style={{
            padding: '20px',
            textAlign: 'center',
            color: '#8c8c8c'
          }}>
            No memecoin data available
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="dca-form" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '500px', margin: '0 auto' }}>
        <div className="form-group" style={{ width: '100%', marginBottom: '1rem' }}>
          <label htmlFor="amount" style={{ display: 'block', marginBottom: '0.5rem', textAlign: 'center' }}>DCA Amount (USDC)</label>
          <div className="input-wrapper" style={{ display: 'flex', justifyContent: 'center' }}>
            <span className="input-prefix" style={{ display: 'flex', alignItems: 'center', padding: '0 10px', backgroundColor: '#f0f0f0', borderRadius: '4px 0 0 4px', border: '1px solid #d9d9d9', borderRight: 'none' }}>$</span>
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
              style={{ 
                textAlign: 'center',
                padding: '8px 12px',
                border: '1px solid #d9d9d9',
                borderRadius: '0',
                fontSize: '16px',
                width: '150px'
              }}
            />
            <span className="input-suffix" style={{ display: 'flex', alignItems: 'center', padding: '0 10px', backgroundColor: '#f0f0f0', borderRadius: '0 4px 4px 0', border: '1px solid #d9d9d9', borderLeft: 'none' }}>USDC</span>
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
              style={{ 
                width: '100%', 
                maxWidth: '300px', 
                textAlign: 'center',
                padding: '8px 12px',
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
                fontSize: '16px'
              }}
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
          disabled={isLoading || isLoadingMemecoin || !topMemecoin}
          style={{ 
            padding: '0.75rem 2rem', 
            fontSize: '1rem', 
            fontWeight: 'bold',
            backgroundColor: isLoading || isLoadingMemecoin || !topMemecoin ? '#ccc' : '#fa8c16',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: isLoading || isLoadingMemecoin || !topMemecoin ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            maxWidth: '300px'
          }}
        >
          {isLoading ? (
            'Processing...'
          ) : (
            <>
              <span role="img" aria-label="Rocket">🚀</span> 
              {topMemecoin ? `Start DCA with ${topMemecoin.symbol}` : 'Start DCA'}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
