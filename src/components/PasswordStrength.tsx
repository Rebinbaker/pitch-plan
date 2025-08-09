import React from 'react';
import { Check, X } from 'lucide-react';

interface PasswordStrengthProps {
  password: string;
}

export const PasswordStrength: React.FC<PasswordStrengthProps> = ({ password }) => {
  const requirements = [
    {
      label: 'Minst 6 tecken',
      met: password.length >= 6
    },
    {
      label: 'Minst en stor bokstav',
      met: /[A-Z]/.test(password)
    },
    {
      label: 'Minst ett specialtecken',
      met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    }
  ];

  const isStrong = requirements.every(req => req.met);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Lösenordsstyrka:</span>
        <span className={`text-sm font-medium ${isStrong ? 'text-success' : 'text-warning'}`}>
          {isStrong ? 'Starkt' : 'Svagt'}
        </span>
      </div>
      <div className="space-y-1">
        {requirements.map((req, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            {req.met ? (
              <Check className="w-3 h-3 text-success" />
            ) : (
              <X className="w-3 h-3 text-destructive" />
            )}
            <span className={req.met ? 'text-success' : 'text-muted-foreground'}>
              {req.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};