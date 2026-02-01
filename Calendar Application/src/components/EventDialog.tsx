import { Event } from './Calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { Calendar, Clock, FileText } from 'lucide-react';

interface EventDialogProps {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EventDialog({ event, open, onOpenChange }: EventDialogProps) {
  if (!event) return null;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getDuration = () => {
    const diff = event.endTime.getTime() - event.startTime.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours === 0) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else if (minutes === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else {
      return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
  };

  const getEventTypeVariant = (type: Event['type']) => {
    switch (type) {
      case 'meeting':
        return 'default';
      case 'reminder':
        return 'destructive';
      case 'event':
        return 'secondary';
      case 'task':
        return 'outline';
      default:
        return 'default';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div 
              className="w-4 h-4 rounded-full" 
              style={{ backgroundColor: event.color }}
            />
            {event.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Event Type */}
          <div className="flex items-center gap-2">
            <Badge variant={getEventTypeVariant(event.type)}>
              {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
            </Badge>
          </div>

          {/* Date and Time */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>{formatDate(event.startTime)}</span>
            </div>
            
            <div className="flex items-center gap-3 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <div>{formatTime(event.startTime)} - {formatTime(event.endTime)}</div>
                <div className="text-muted-foreground">Duration: {getDuration()}</div>
              </div>
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Description</span>
              </div>
              <p className="text-sm text-muted-foreground pl-6">
                {event.description}
              </p>
            </div>
          )}

          {/* Additional Details */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Event ID:</span>
              <span className="font-mono">{event.id}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Created:</span>
              <span>System Event</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}