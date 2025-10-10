import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';

interface FarmlandCardProps {
  id: string;
  name: string;
  location: string;
  price: string | number;
  images?: string[];
  imageUrl?: string;
  onPress: () => void;
}

const FarmlandCard: React.FC<FarmlandCardProps> = ({ 
  id, 
  name, 
  location, 
  price, 
  images, 
  imageUrl, 
  onPress 
}) => {
  // Use imageUrl if provided, otherwise use first image from images array
  const displayImage = imageUrl || (images && images.length > 0 ? images[0] : 'https://via.placeholder.com/300x150');
  
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Image source={{ uri: displayImage }} style={styles.image} />
      <View style={styles.details}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.location}>{location}</Text>
        <Text style={styles.price}>
          {typeof price === 'number' ? `$${price.toLocaleString()}` : price}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  details: {
    padding: 16,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    color: '#64748B',
    marginVertical: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F59E0B',
  },
});

export default FarmlandCard;