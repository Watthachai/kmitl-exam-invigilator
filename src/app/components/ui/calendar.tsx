import * as React from "react";
import { DayPicker, DayClickEventHandler, DayPickerSingleProps, DayPickerMultipleProps } from "react-day-picker";
import "react-day-picker/style.css";
import { th } from 'date-fns/locale';

interface BaseCalendarProps {
    className?: string;
    modifiers?: Record<string, (date: Date) => boolean>;
    modifiersClassNames?: Record<string, string>;
}

interface SingleCalendarProps extends BaseCalendarProps {
    mode?: 'single';
    selected?: Date;
    onSelect?: (date: Date | undefined) => void;
}

interface MultipleCalendarProps extends BaseCalendarProps {
    mode: 'multiple';
    selected?: Date[];
    onSelect?: (dates: Date[]) => void;
}

type CalendarProps = SingleCalendarProps | MultipleCalendarProps;

export function Calendar({
    mode = 'single',
    selected,
    onSelect,
    modifiers,
    modifiersClassNames,
    className,
    ...props
}: CalendarProps) {
    const handleSelect: DayClickEventHandler = (day) => {
        if (!onSelect) return;

        if (mode === 'multiple') {
            const currentSelection = (selected as Date[]) || [];
            const isSelected = currentSelection.some(
                d => d.getTime() === day.getTime()
            );
            
            const newSelection = isSelected
                ? currentSelection.filter(d => d.getTime() !== day.getTime())
                : [...currentSelection, day];
            
            (onSelect as MultipleCalendarProps['onSelect'])?.(newSelection);
        } else {
            (onSelect as SingleCalendarProps['onSelect'])?.(day);
        }
    };

    // Create proper props based on mode
    const dayPickerProps = {
        mode,
        selected,
        onDayClick: handleSelect,
        className,
        modifiers,
        modifiersClassNames,
        locale: th,
        required: false, // Add required prop
        ...props
    } as DayPickerSingleProps | DayPickerMultipleProps;

    return <DayPicker {...dayPickerProps} />;
}