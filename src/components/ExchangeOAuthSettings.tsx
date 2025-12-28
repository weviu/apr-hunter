'use client';

import { useState } from 'react';
import { Loader, CheckCircle, AlertCircle, LogOut } from 'lucide-react';
import { useConnectedExchanges, useInitiateOAuth, useDisconnectExchange } from '@/lib/hooks/useExchangeOAuth';

const EXCHANGES = ['Binance', 'OKX', 'KuCoin'];

export function ExchangeOAuthSettings() {
  const { data: connectedData, isLoading: loadingConnected, error: connectedError } = useConnectedExchanges();
  const initiateOAuth = useInitiateOAuth();
  const disconnectExchange = useDisconnectExchange();
  const [error, setError] = useState<string | null>(null);

  const connected = connectedData?.connected || [];
  const all = connectedData?.all || EXCHANGES;

  const handleConnect = (exchange: string) => {
    setError(null);
    initiateOAuth.mutate(exchange, {
      onError: (err: any) => {
        setError(`Failed to connect ${exchange}: ${err.message}`);
      },
    });
  };

  const handleDisconnect = (exchange: string) => {
    setError(null);
    disconnectExchange.mutate(exchange, {
      onError: (err: any) => {
        setError(`Failed to disconnect ${exchange}: ${err.message}`);
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Connected Exchanges</h2>
        <p className="text-gray-400">Authenticate with exchanges to import your holdings securely using OAuth.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-red-400">{error}</div>
        </div>
      )}

      {connectedError && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-red-400">Failed to load connected exchanges</div>
        </div>
      )}

      {loadingConnected ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="h-6 w-6 text-emerald-500 animate-spin mr-2" />
          <span className="text-gray-400">Loading exchanges...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {all.map((exchange) => {
            const isConnected = connected.includes(exchange);
            const isLoading = initiateOAuth.isPending || (disconnectExchange.isPending && disconnectExchange.variables === exchange);

            return (
              <div key={exchange} className="bg-gray-800 border border-gray-700 rounded-lg p-6 flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">{exchange}</h3>
                  {isConnected && (
                    <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                  )}
                </div>

                <p className="text-sm text-gray-400 flex-1 mb-4">
                  {isConnected
                    ? `${exchange} is connected. You can now import your holdings.`
                    : `Click below to authenticate with ${exchange} and securely import your holdings.`}
                </p>

                {isConnected ? (
                  <button
                    onClick={() => handleDisconnect(exchange)}
                    disabled={isLoading}
                    className="w-full px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 disabled:opacity-50 rounded-lg transition font-medium flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin" />
                        Disconnecting...
                      </>
                    ) : (
                      <>
                        <LogOut className="h-4 w-4" />
                        Disconnect
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnect(exchange)}
                    disabled={isLoading}
                    className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg transition font-medium flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      `Connect ${exchange}`
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <h4 className="font-semibold text-blue-300 mb-2">How it works</h4>
        <ul className="text-sm text-blue-200 space-y-1">
          <li>• Click "Connect" to authenticate with an exchange via OAuth</li>
          <li>• You'll be redirected to the exchange to approve access</li>
          <li>• Once approved, we can securely fetch your holdings</li>
          <li>• Your API keys are never shared with us - only access tokens</li>
          <li>• You can disconnect at any time from your exchange settings</li>
        </ul>
      </div>
    </div>
  );
}
