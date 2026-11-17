import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Share, Download } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

export type QRPayload = {
  app: 'jjsimex';
  type: 'shipment' | 'shopper' | 'pickup';
  ref: string;
  id: string;
};

export function buildQRValue(payload: QRPayload): string {
  return JSON.stringify(payload);
}

type Props = {
  type: QRPayload['type'];
  referenceNumber: string;
  id: string;
  size?: number;
  showActions?: boolean;
  label?: string;
};

export function QRCodeDisplay({ type, referenceNumber, id, size = 180, showActions = true, label }: Props) {
  const svgRef = useRef<any>(null);
  const { colors } = useTheme();

  const value = buildQRValue({ app: 'jjsimex', type, ref: referenceNumber, id });

  function handleShare() {
    if (!svgRef.current) return;
    svgRef.current.toDataURL((base64: string) => {
      const shareAsync = async () => {
        try {
          const { shareAsync: share } = require('expo-sharing');
          const { writeAsStringAsync, cacheDirectory, EncodingType } = require('expo-file-system');
          const path = `${cacheDirectory}qr-${referenceNumber}.png`;
          await writeAsStringAsync(path, base64, { encoding: EncodingType.Base64 });
          await share(path, { mimeType: 'image/png', dialogTitle: `QR Code - ${referenceNumber}` });
        } catch {
          Alert.alert('QR Code', referenceNumber);
        }
      };
      shareAsync();
    });
  }

  return (
    <View style={styles.container}>
      <View style={styles.qrWrapper}>
        <QRCode
          value={value}
          size={size}
          backgroundColor="#FFFFFF"
          color="#000000"
          getRef={(ref: any) => (svgRef.current = ref)}
        />
      </View>
      {label && <Text style={styles.label}>{label}</Text>}
      <Text style={[styles.ref, { color: colors.accent }]}>{referenceNumber}</Text>
      {showActions && (
        <TouchableOpacity style={[styles.shareBtn, { backgroundColor: colors.accentLight }]} onPress={handleShare} activeOpacity={0.8}>
          <Share size={15} color={colors.accent} strokeWidth={2} />
          <Text style={[styles.shareBtnText, { color: colors.accent }]}>Partager le QR</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function QRCodeMini({ type, referenceNumber, id, onPress }: { type: QRPayload['type']; referenceNumber: string; id: string; onPress?: () => void }) {
  const value = buildQRValue({ app: 'jjsimex', type, ref: referenceNumber, id });
  const { colors } = useTheme();

  return (
    <TouchableOpacity style={[styles.miniContainer, { backgroundColor: colors.accentLight }]} onPress={onPress} activeOpacity={0.8}>
      <QRCode value={value} size={36} backgroundColor="transparent" color={colors.text} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 10 },
  qrWrapper: {
    padding: 12, backgroundColor: '#FFFFFF', borderRadius: 14,
  },
  label: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  ref: { fontSize: 16, fontWeight: '800' },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 99,
  },
  shareBtnText: { fontSize: 13, fontWeight: '600' },
  miniContainer: {
    width: 44, height: 44, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
});
