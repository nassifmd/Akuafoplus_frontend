import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface InquiryCardProps {
  inquiry: {
    id: string;
    farmlandName: string;
    userName: string;
    status: string;
    message: string;
  };
}

const InquiryCard: React.FC<InquiryCardProps> = ({ inquiry }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{inquiry.farmlandName}</Text>
      <Text style={styles.user}>Inquired by: {inquiry.userName}</Text>
      <Text style={styles.status}>Status: {inquiry.status}</Text>
      <Text style={styles.message}>{inquiry.message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  user: {
    fontSize: 14,
    color: '#64748B',
  },
  status: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  message: {
    fontSize: 14,
    color: '#374151',
    marginTop: 8,
  },
});

export default InquiryCard;