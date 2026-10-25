import React from 'react';
import { AlertCircle, CheckCircle, Loader2, XCircle } from 'lucide-react';

export type CertificationStatusType = 'idle' | 'processing' | 'success' | 'error';

interface CertificationStatusProps {
  status: CertificationStatusType;
  message?: string;
  codeSECeF?: string;
  className?: string;
}

export const CertificationStatus: React.FC<CertificationStatusProps> = ({
  status,
  message,
  codeSECeF,
  className = '',
}) => {
  if (status === 'idle') return null;

  const statusConfig = {
    processing: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: <Loader2 className="animate-spin text-blue-600" size={20} />,
      title: 'Certification en cours...',
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: <CheckCircle className="text-green-600" size={20} />,
      title: '✅ Facture certifiée avec succès!',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: <XCircle className="text-red-600" size={20} />,
      title: '❌ Erreur de certification',
    },
  };

  const config = statusConfig[status];

  return (
    <div className={`${config.bg} border ${config.border} rounded-lg p-4 ${className}`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-semibold ${config.text} mb-1`}>
            {config.title}
          </h4>
          {message && (
            <p className={`text-sm ${config.text} whitespace-pre-line`}>
              {message}
            </p>
          )}
          {codeSECeF && status === 'success' && (
            <div className="mt-2 p-2 bg-white rounded border border-green-300">
              <p className="text-xs text-gray-600 mb-1">Code SECeF/DGI :</p>
              <p className="font-mono text-sm text-gray-900 break-all">{codeSECeF}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
