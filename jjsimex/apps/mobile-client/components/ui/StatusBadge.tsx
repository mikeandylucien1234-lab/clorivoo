import React from 'react';
import { View, Text } from 'react-native';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:      { label: 'En attente',   color: '#9CA3AF', bg: 'rgba(156,163,175,0.14)' },
  received_usa: { label: 'Reçu USA',     color: '#3B82F6', bg: 'rgba(59,130,246,0.14)' },
  in_transit:   { label: 'En transit',   color: '#F59E0B', bg: 'rgba(245,158,11,0.14)' },
  arrived:      { label: 'Arrivé',       color: '#A855F7', bg: 'rgba(168,85,247,0.14)' },
  ready_pickup: { label: 'Prêt retrait', color: '#06B6D4', bg: 'rgba(6,182,212,0.14)' },
  delivered:    { label: 'Livré',        color: '#22C55E', bg: 'rgba(34,197,94,0.14)' },
  confirmed:    { label: 'Confirmé',     color: '#22C55E', bg: 'rgba(34,197,94,0.14)' },
  failed:       { label: 'Échoué',       color: '#EF4444', bg: 'rgba(239,68,68,0.14)' },
  refunded:     { label: 'Remboursé',    color: '#3B82F6', bg: 'rgba(59,130,246,0.14)' },
  quoted:       { label: 'Devis envoyé', color: '#3B82F6', bg: 'rgba(59,130,246,0.14)' },
  cancelled:    { label: 'Annulé',       color: '#EF4444', bg: 'rgba(239,68,68,0.14)' },
  purchased:    { label: 'Acheté',       color: '#A855F7', bg: 'rgba(168,85,247,0.14)' },
  shipped:      { label: 'Expédié',      color: '#22C55E', bg: 'rgba(34,197,94,0.14)' },
};

interface Props { status: string; label?: string; size?: 'sm' | 'md'; }

export function StatusBadge({ status, label, size = 'sm' }: Props) {
  const cfg = STATUS_CONFIG[status.toLowerCase()] ?? { label: status, color: '#9CA3AF', bg: 'rgba(156,163,175,0.14)' };
  const padding = size === 'md' ? { paddingHorizontal: 12, paddingVertical: 5 } : { paddingHorizontal: 9, paddingVertical: 3 };
  const fontSize = size === 'md' ? 13 : 11;
  return (
    <View style={{ backgroundColor: cfg.bg, borderRadius: 999, ...padding, alignSelf: 'flex-start' }}>
      <Text style={{ color: cfg.color, fontSize, fontWeight: '600' }}>{label ?? cfg.label}</Text>
    </View>
  );
}
