export interface Coin {
  symbol: string;
  name: string;
  price: string;
  coinAddress: string;
}

export async function fetchBaseMemeCoins(): Promise<Coin> {
  const COINRANKING_API_KEY = process.env.COINRANKING_API_KEY;

  if (!COINRANKING_API_KEY) {
    throw new Error('COINRANKING_API_KEY environment variable is not set');
  }

  try {
    const url = new URL('https://api.coinranking.com/v2/coins');
    url.searchParams.append('blockchains[]', 'base');
    url.searchParams.append('tags[]', 'meme');

    const response = await fetch(url, {
      headers: {
        'x-access-token': COINRANKING_API_KEY as string,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const { status, data } = (await response.json()) as {
      status: string;
      data: {
        coins: Array<{
          symbol: string;
          name: string;
          price: string;
          contractAddresses: string[];
        }>;
      };
    };

    if (status !== 'success') {
      throw new Error('API returned unsuccessful status');
    }

    const topCoin = data.coins[0];
    const baseAddress = topCoin.contractAddresses.find((addr) =>
      addr.toLowerCase().startsWith('base/')
    );

    if (!baseAddress) {
      throw new Error('No Base network address found for top coin');
    }

    return {
      symbol: topCoin.symbol,
      name: topCoin.name,
      price: topCoin.price,
      coinAddress: baseAddress.replace('base/', ''),
    };
  } catch (error) {
    console.error('Failed to fetch meme coins:', error);
    throw new Error('Failed to fetch meme coins');
  }
}
