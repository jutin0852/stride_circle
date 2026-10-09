import AsyncStorage from '@react-native-async-storage/async-storage';
import { reminderDevice } from './notification-device';
import { createWalkingReminderService } from './walking-reminder-service';

export const walkingReminders = createWalkingReminderService(AsyncStorage, reminderDevice);
