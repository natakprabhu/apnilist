import { useMemo } from 'react';
import { Check, X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface PasswordStrengthIndicatorProps {
  password: string;
}

const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
  const checks = useMemo(() => [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Number', met: /[0-9]/.test(password) },
    { label: 'Special character (!@#$%)', met: /[^A-Za-z0-9]/.test(password) },
  ], [password]);

  const score = checks.filter(c => c.met).length;
  const percentage = (score / checks.length) * 100;

  const strengthLabel = score <= 1 ? 'Weak' : score <= 2 ? 'Fair' : score <= 3 ? 'Good' : score <= 4 ? 'Strong' : 'Excellent';
  const strengthColor = score <= 1 ? 'text-destructive' : score <= 2 ? 'text-orange-500' : score <= 3 ? 'text-yellow-600' : 'text-green-600';
  const progressColor = score <= 1 ? '[&>div]:bg-destructive' : score <= 2 ? '[&>div]:bg-orange-500' : score <= 3 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-green-500';

  if (!password) return null;

  return (
    <div className="space-y-3 pt-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Password strength</span>
        <span className={`text-xs font-semibold ${strengthColor}`}>{strengthLabel}</span>
      </div>
      <Progress value={percentage} className={`h-2 ${progressColor}`} />
      <ul className="grid grid-cols-1 gap-1.5">
        {checks.map((check) => (
          <li key={check.label} className="flex items-center gap-2 text-xs">
            {check.met ? (
              <Check className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
            ) : (
              <X className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            )}
            <span className={check.met ? 'text-green-700' : 'text-muted-foreground'}>
              {check.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PasswordStrengthIndicator;
