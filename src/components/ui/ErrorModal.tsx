import { AlertTriangle, X, CheckCircle, Info } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type ModalType = 'error' | 'success' | 'info' | 'warning';

interface ErrorModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  type?: ModalType;
  action?: { label: string; onClick: () => void };
}

const CONFIG: Record<ModalType, { icon: React.ElementType; bg: string; iconColor: string; border: string }> = {
  error: {
    icon: AlertTriangle,
    bg: 'bg-red-50',
    iconColor: 'text-red-600',
    border: 'border-red-200',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    border: 'border-amber-200',
  },
  success: {
    icon: CheckCircle,
    bg: 'bg-green-50',
    iconColor: 'text-green-600',
    border: 'border-green-200',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    border: 'border-blue-200',
  },
};

export const ErrorModal = ({ open, onClose, title, description, type = 'error', action }: ErrorModalProps) => {
  const { icon: Icon, bg, iconColor, border } = CONFIG[type];

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        <div className={`${bg} ${border} border-b p-5 flex items-start gap-3`}>
          <div className={`p-2 rounded-full bg-white/70 shrink-0`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{title}</p>
            {description && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 flex gap-2 justify-end bg-background">
          {action && (
            <Button size="sm" onClick={() => { action.onClick(); onClose(); }}>
              {action.label}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onClose}>
            Dismiss
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ErrorModal;
