declare module '@react-native-community/datetimepicker' {
  import * as React from 'react';
  import { ViewProps } from 'react-native';

  type AndroidDisplay = 'default' | 'spinner' | 'calendar' | 'clock';
  type IOSDisplay = 'default' | 'spinner' | 'inline' | 'compact';

  export type DateTimePickerMode = 'date' | 'time' | 'datetime';

  export interface DateTimePickerEvent {
    type: 'set' | 'dismissed';
    nativeEvent: {
      timestamp: number;
    };
  }

  export interface DateTimePickerProps extends ViewProps {
    value: Date;
    mode?: DateTimePickerMode;
    display?: AndroidDisplay | IOSDisplay;
    onChange: (event: DateTimePickerEvent, date?: Date) => void;
    maximumDate?: Date;
    minimumDate?: Date;
  }

  const DateTimePicker: React.ComponentType<DateTimePickerProps>;
  export default DateTimePicker;
}