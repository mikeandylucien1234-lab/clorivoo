import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

const FAQ_ITEMS = [
  {
    q: 'Comment fonctionne le service JJ\'s IMEX ?',
    a: 'Vous commandez en ligne sur n\'importe quel site américain (Amazon, Shein, Nike, etc.) et utilisez notre adresse de Miami comme adresse de livraison. Une fois votre colis reçu dans notre entrepôt, nous l\'expédions vers votre pays de destination.',
  },
  {
    q: 'Combien de temps prend la livraison ?',
    a: 'Le délai moyen est de 7 à 14 jours ouvrables après réception de votre colis dans notre entrepôt de Miami. Ce délai peut varier selon la destination et le mode d\'expédition choisi.',
  },
  {
    q: 'Comment calculer les frais d\'expédition ?',
    a: 'Les frais sont calculés en fonction du poids et des dimensions de votre colis. Utilisez notre calculateur de tarifs dans l\'application pour obtenir une estimation. Le tarif de base est de $5/livre.',
  },
  {
    q: 'Quels modes de paiement acceptez-vous ?',
    a: 'Nous acceptons MonCash, Zelle, et les virements bancaires. Vous pouvez configurer votre mode de paiement préféré dans la section "Mes paiements" de votre profil.',
  },
  {
    q: 'Comment suivre mon colis ?',
    a: 'Chaque colis reçoit un numéro de suivi JJ\'s IMEX. Vous pouvez suivre l\'état de vos colis en temps réel depuis l\'onglet "Mes colis" de l\'application.',
  },
  {
    q: 'Que faire si mon colis est endommagé ?',
    a: 'Contactez-nous immédiatement via WhatsApp au +1 (305) 600-9364. Nous prendrons des photos à la réception et vous proposerons une solution adaptée.',
  },
  {
    q: 'Comment ajouter mon ID client à mes commandes ?',
    a: 'Lors de vos achats en ligne, ajoutez votre ID client (ex: JJI-00247) dans le champ "Adresse ligne 2" ou "Suite". Cela nous permet d\'identifier rapidement vos colis.',
  },
  {
    q: 'Le service Personal Shopper, c\'est quoi ?',
    a: 'Si vous ne pouvez pas commander vous-même (pas de carte bancaire US, site non accessible, etc.), notre équipe peut acheter les articles pour vous. Des frais de service s\'appliquent en plus du prix de l\'article.',
  },
];

export default function FAQScreen() {
  const router = useRouter();
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <View style={S.container}>
      <View style={S.header}>
        <TouchableOpacity style={S.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Text style={{ color: '#FFFFFF', fontSize: 20 }}>&#8592;</Text>
        </TouchableOpacity>
        <Text style={S.headerTitle}>Centre d'aide & FAQ</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 40 }}>
        {FAQ_ITEMS.map((item, i) => (
          <TouchableOpacity
            key={i}
            activeOpacity={0.8}
            onPress={() => setExpanded(expanded === i ? null : i)}
            style={S.card}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={S.question}>{item.q}</Text>
              <Text style={{ color: '#22C55E', fontSize: 18, marginLeft: 12 }}>
                {expanded === i ? '−' : '+'}
              </Text>
            </View>
            {expanded === i && (
              <Text style={S.answer}>{item.a}</Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  header: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  backBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  card: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 12, padding: 16, marginBottom: 12 },
  question: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', flex: 1 },
  answer: { fontSize: 13, lineHeight: 20, color: '#9CA3AF', marginTop: 12 },
});
