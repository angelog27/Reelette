import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors } from '../../constants/colors';

interface Props {
  visible: boolean;
}

const MESSAGES = [
  'Warming up the server…',
  'This takes ~15 s on first load.',
  'Render free tier cold start — hang tight.',
];

export function ColdStartBanner({ visible }: Props) {
  const [msgIdx, setMsgIdx] = React.useState(0);

  React.useEffect(() => {
    if (!visible) return;
    const t = setInterval(() => setMsgIdx(i => (i + 1) % MESSAGES.length), 4000);
    return () => clearInterval(t);
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.banner}>
      <ActivityIndicator size="small" color={Colors.accent} />
      <Text style={styles.text}>{MESSAGES[msgIdx]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(212,168,67,0.12)',
    borderColor: 'rgba(212,168,67,0.25)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 12,
  },
  text: {
    color: Colors.accent,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
});
