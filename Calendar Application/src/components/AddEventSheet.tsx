import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { CalendarIcon, Clock, X } from 'lucide-react';
import { Event, Participant } from './Calendar';
import { format } from 'date-fns';
import { Avatar, AvatarFallback } from './ui/avatar';

interface AddEventSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddEvent: (event: Omit<Event, 'id' | 'creator'>) => void;
  defaultDate: Date;
}

// Available participants
const availableParticipants: Participant[] = [
  { id: 'p1', name: 'Леня', avatar: 'Л', color: '#ef4444' },
  { id: 'p2', name: 'Таня', avatar: 'Т', color: '#10b981' },
  { id: 'p3', name: 'Яся', avatar: 'Я', color: '#f59e0b' }
];

export function AddEventSheet({ open, onOpenChange, onAddEvent, defaultDate }: AddEventSheetProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(defaultDate);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [eventType, setEventType] = useState<Event['type']>('event');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState<Participant[]>([]);
  const [recurrenceType, setRecurrenceType] = useState<'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('none');

  const eventTypeColors = {
    meeting: '#3b82f6',
    reminder: '#ef4444',
    event: '#f59e0b',
    task: '#8b5cf6'
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSelectedDate(defaultDate);
    setStartTime('09:00');
    setEndTime('10:00');
    setEventType('event');
    setSelectedParticipants([]);
    setRecurrenceType('none');
  };

  const toggleParticipant = (participant: Participant) => {
    setSelectedParticipants(prev => {
      const exists = prev.find(p => p.id === participant.id);
      if (exists) {
        return prev.filter(p => p.id !== participant.id);
      } else {
        return [...prev, participant];
      }
    });
  };

  const handleSubmit = () => {
    if (!title.trim()) return;

    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const startDateTime = new Date(selectedDate);
    startDateTime.setHours(startHour, startMinute, 0, 0);

    const endDateTime = new Date(selectedDate);
    endDateTime.setHours(endHour, endMinute, 0, 0);

    const newEvent: Omit<Event, 'id' | 'creator'> = {
      title: title.trim(),
      description: description.trim(),
      startTime: startDateTime,
      endTime: endDateTime,
      type: eventType,
      color: eventTypeColors[eventType],
      isGroupEvent: selectedParticipants.length > 0,
      participants: selectedParticipants,
      recurrence: {
        type: recurrenceType,
        interval: 1
      }
    };

    onAddEvent(newEvent);
    resetForm();
  };

  const handleCancel = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-xl overflow-y-auto">
        <SheetHeader className="pb-6">
          <SheetTitle>Add New Event</SheetTitle>
          <SheetDescription>
            Create a new event by filling out the details below.
          </SheetDescription>
        </SheetHeader>
        
        <div className="space-y-6 pb-6">
          {/* Event Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Event Name</Label>
            <Input
              id="title"
              placeholder="Enter event name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-base"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              placeholder="Add event description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-base"
            />
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left text-base h-10"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date);
                      setIsDatePickerOpen(false);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">Start Time</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="pl-10 text-base"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">End Time</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="pl-10 text-base"
                />
              </div>
            </div>
          </div>

          {/* Recurrence */}
          <div className="space-y-2">
            <Label>Repeat</Label>
            <Select value={recurrenceType} onValueChange={(value: typeof recurrenceType) => setRecurrenceType(value)}>
              <SelectTrigger className="text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Does not repeat</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Participants */}
          <div className="space-y-3">
            <Label>Participants</Label>
            <div className="flex flex-wrap gap-2">
              {availableParticipants.map((participant) => {
                const isSelected = selectedParticipants.find(p => p.id === participant.id);
                return (
                  <button
                    key={participant.id}
                    type="button"
                    onClick={() => toggleParticipant(participant)}
                    className={`flex items-center gap-2 rounded-full px-3 py-2 transition-all ${
                      isSelected 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-secondary/50 hover:bg-secondary'
                    }`}
                  >
                    <Avatar className="h-5 w-5">
                      <AvatarFallback 
                        className="text-[10px]"
                        style={{ 
                          backgroundColor: isSelected ? 'white' : participant.color, 
                          color: isSelected ? participant.color : 'white' 
                        }}
                      >
                        {participant.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{participant.name}</span>
                    {isSelected && <X className="h-3 w-3" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1 h-12"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!title.trim()}
              className="flex-1 h-12"
            >
              Add Event
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}