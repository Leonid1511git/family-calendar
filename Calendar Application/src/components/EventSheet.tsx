import { Event } from './Calendar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Calendar, Clock, FileText, MapPin, Users, Repeat } from 'lucide-react';

interface EventSheetProps {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EventSheet({ event, open, onOpenChange }: EventSheetProps) {
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
      return `${minutes}m`;
    } else if (minutes === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${minutes}m`;
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

  const getRecurrenceText = () => {
    if (!event.recurrence || event.recurrence.type === 'none') return null;
    
    const typeMap = {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      yearly: 'Yearly'
    };
    
    return typeMap[event.recurrence.type];
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-3 text-left">
            <div 
              className="w-4 h-4 rounded-full flex-shrink-0" 
              style={{ backgroundColor: event.color }}
            />
            <span className="truncate">{event.title}</span>
          </SheetTitle>
          <SheetDescription>Event details and information</SheetDescription>
        </SheetHeader>
        
        <div className="space-y-6 pb-6">
          {/* Event Type and Duration */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={getEventTypeVariant(event.type)} className="text-xs">
              {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
            </Badge>
            <span className="text-sm text-muted-foreground">• {getDuration()}</span>
            {event.isGroupEvent && (
              <Badge variant="outline" className="text-xs">
                <Users className="w-3 h-3 mr-1" />
                Group Event
              </Badge>
            )}
          </div>

          {/* Creator */}
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback 
                style={{ backgroundColor: event.creator.color, color: 'white' }}
              >
                {event.creator.avatar}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm">Created by {event.creator.name}</p>
              <p className="text-xs text-muted-foreground">Event organizer</p>
            </div>
          </div>

          {/* Participants */}
          {event.participants && event.participants.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-medium">Participants</span>
              </div>
              <div className="flex flex-wrap gap-2 pl-8">
                {event.participants.map((participant) => (
                  <div 
                    key={participant.id}
                    className="flex items-center gap-2 bg-secondary/50 rounded-full px-3 py-1.5"
                  >
                    <Avatar className="h-5 w-5">
                      <AvatarFallback 
                        className="text-[10px]"
                        style={{ backgroundColor: participant.color, color: 'white' }}
                      >
                        {participant.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{participant.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Date and Time */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm">{formatDate(event.startTime)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatTime(event.startTime)} - {formatTime(event.endTime)}
                </p>
              </div>
            </div>
          </div>

          {/* Recurrence */}
          {getRecurrenceText() && (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Repeat className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Repeats {getRecurrenceText()}</p>
                  {event.recurrence?.endDate && (
                    <p className="text-xs text-muted-foreground">
                      Until {formatDate(event.recurrence.endDate)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-medium">Description</span>
              </div>
              <p className="text-sm text-muted-foreground pl-8 leading-relaxed">
                {event.description}
              </p>
            </div>
          )}

          {/* Location placeholder */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium">Location</span>
            </div>
            <p className="text-sm text-muted-foreground pl-8">
              {event.type === 'meeting' ? 'Conference Room A' : 
               event.type === 'event' ? 'To be determined' : 
               'Online'}
            </p>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t space-y-3">
            <button className="w-full bg-primary text-primary-foreground rounded-lg py-3 text-sm font-medium">
              {event.type === 'meeting' ? 'Join Meeting' : 'View Details'}
            </button>
            <div className="flex gap-2">
              <button className="flex-1 bg-secondary text-secondary-foreground rounded-lg py-3 text-sm font-medium">
                Edit
              </button>
              <button className="flex-1 bg-destructive/10 text-destructive rounded-lg py-3 text-sm font-medium">
                Delete
              </button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}