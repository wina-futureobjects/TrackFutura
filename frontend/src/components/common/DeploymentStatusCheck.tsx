import { AlertCircle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../utils/api';

interface DeploymentStatus {
  apiReachable: boolean;
  correctUrl: string | null;
  error: string | null;
  isLoading: boolean;
}

interface DeploymentStatusCheckProps {
  onStatusChange?: (status: DeploymentStatus) => void;
  showDetails?: boolean;
}

export const DeploymentStatusCheck: React.FC<DeploymentStatusCheckProps> = ({
  onStatusChange,
  showDetails = false
}) => {
  const [status, setStatus] = useState<DeploymentStatus>({
    apiReachable: false,
    correctUrl: null,
    error: null,
    isLoading: true
  });

  const checkApiStatus = async () => {
    setStatus(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Try a simple health check endpoint
      const response = await apiFetch('/api/health/', {
        method: 'GET'
      });

      const contentType = response.headers.get('content-type');
      const isJson = contentType?.includes('application/json');

      if (response.ok && isJson) {
        const newStatus = {
          apiReachable: true,
          correctUrl: response.url,
          error: null,
          isLoading: false
        };
        setStatus(newStatus);
        onStatusChange?.(newStatus);
      } else if (response.ok && contentType?.includes('text/html')) {
        // Got HTML instead of JSON - API misconfiguration
        const newStatus = {
          apiReachable: false,
          correctUrl: null,
          error: 'API endpoint misconfigured - receiving HTML instead of JSON',
          isLoading: false
        };
        setStatus(newStatus);
        onStatusChange?.(newStatus);
      } else {
        const newStatus = {
          apiReachable: false,
          correctUrl: null,
          error: `API returned ${response.status}: ${response.statusText}`,
          isLoading: false
        };
        setStatus(newStatus);
        onStatusChange?.(newStatus);
      }
    } catch (error) {
      const newStatus = {
        apiReachable: false,
        correctUrl: null,
        error: error instanceof Error ? error.message : 'Network error',
        isLoading: false
      };
      setStatus(newStatus);
      onStatusChange?.(newStatus);
    }
  };

  useEffect(() => {
    checkApiStatus();
  }, []);

  if (!showDetails) {
    return null;
  }

  return (
    <div className="mb-4 p-3 rounded-lg border">
      <div className="flex items-center gap-2 mb-2">
        {status.isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
        ) : status.apiReachable ? (
          <CheckCircle className="w-4 h-4 text-green-500" />
        ) : (
          <AlertCircle className="w-4 h-4 text-red-500" />
        )}
        <span className="text-sm font-medium">
          {status.isLoading ? 'Checking API connection...' :
           status.apiReachable ? 'API connection healthy' :
           'API connection issues detected'}
        </span>
        <button
          onClick={checkApiStatus}
          disabled={status.isLoading}
          className="ml-auto p-1 hover:bg-gray-100 rounded"
        >
          <RefreshCw className={`w-4 h-4 ${status.isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {status.error && (
        <div className="text-xs text-red-600 mb-2">
          {status.error}
        </div>
      )}

      {status.correctUrl && (
        <div className="text-xs text-gray-500">
          Connected to: {status.correctUrl}
        </div>
      )}

      {!status.apiReachable && !status.isLoading && (
        <div className="text-xs text-gray-600 mt-2">
          <p>If you're seeing this error:</p>
          <ul className="list-disc list-inside ml-2 mt-1">
            <li>Check if the backend is deployed and running</li>
            <li>Verify API endpoint configuration</li>
            <li>Check network connectivity</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default DeploymentStatusCheck;
