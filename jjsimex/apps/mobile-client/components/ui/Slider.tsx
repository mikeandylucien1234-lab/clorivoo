import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  label?: string;
  formatValue?: (v: number) => string;
}

export function Slider({ min, max, value, onChange, step = 1, label, formatValue }: Props) {
  const { colors, isDark } = useTheme();
  const pct = ((value - min) / (max - min)) * 100;

  function adjust(delta: number) {
    const next = Math.round((value + delta) / step) * step;
    onChange(Math.max(min, Math.min(max, next)));
  }

  return (
    <View>
      {label && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>{label}</Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.accent }}>{formatValue ? formatValue(value) : value}</Text>
        </View>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity onPress={() => adjust(-step)} activeOpacity={0.7}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>−</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, height: 6, backgroundColor: colors.border, borderRadius: 3 }}>
          <View style={{ width: `${pct}%`, height: 6, backgroundColor: colors.accent, borderRadius: 3 }} />
        </View>
        <TouchableOpacity onPress={() => adjust(step)} activeOpacity={0.7}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
