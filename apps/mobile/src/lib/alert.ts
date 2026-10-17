import { Alert, Platform, type AlertButton } from 'react-native';

/**
 * Alert.alert, except that it also works in the browser preview: react-native-web's Alert does nothing,
 * so on web a message uses window.alert and a choice uses window.confirm (OK runs the last non-cancel button).
 */
export const showAlert = (title: string, message?: string, buttons?: AlertButton[]) => {
  if (Platform.OS !== 'web') return Alert.alert(title, message, buttons);
  const text = message ? `${title}\n\n${message}` : title;
  const cancel = buttons?.find((b) => b.style === 'cancel');
  const actions = buttons?.filter((b) => b !== cancel) ?? [];
  if (!cancel) {
    window.alert(text);
    actions[0]?.onPress?.();
  } else if (window.confirm(text)) {
    actions[actions.length - 1]?.onPress?.();
  } else {
    cancel.onPress?.();
  }
};
