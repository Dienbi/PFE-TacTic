import React from 'react';

interface ChangeItemCardProps {
  title: string;
  subtitle: string;
  status?: string;
  documentPath?: string;
  onVerify: () => void;
  onReject: () => void;
  loading?: boolean;
}

export const ChangeItemCard: React.FC<ChangeItemCardProps> = ({
  title,
  subtitle,
  status,
  documentPath,
  onVerify,
  onReject,
  loading = false,
}) => {
  const getDocumentUrl = (path?: string): string | undefined => {
    if (!path) return undefined;
    const apiUrl = process.env.REACT_APP_API_URL || 'http://backend.test/api';
    const baseUrl = apiUrl.replace('/api', '');
    return `${baseUrl}/storage/${path}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600">{subtitle}</p>
        </div>
        {status && (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
            {status}
          </span>
        )}
      </div>

      {documentPath && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Document:</p>
          <a
            href={getDocumentUrl(documentPath)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 text-sm underline"
          >
            View Document
          </a>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onVerify}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {loading ? 'Processing...' : 'Verify'}
        </button>
        <button
          onClick={onReject}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {loading ? 'Processing...' : 'Reject'}
        </button>
      </div>
    </div>
  );
};
