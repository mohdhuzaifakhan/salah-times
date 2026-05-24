import { Platform, ScrollView, ScrollViewProps, KeyboardAvoidingView } from "react-native";

type Props = ScrollViewProps;

export function KeyboardAwareScrollViewCompat({
  children,
  keyboardShouldPersistTaps = "handled",
  ...props
}: Props) {
  if (Platform.OS === "web") {
    return (
      <ScrollView keyboardShouldPersistTaps={keyboardShouldPersistTaps} {...props}>
        {children}
      </ScrollView>
    );
  }
  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <ScrollView
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        automaticallyAdjustKeyboardInsets={true}
        {...props}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
