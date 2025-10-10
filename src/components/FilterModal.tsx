import React, { useState } from 'react';
import { Modal, View, Text, TextInput, Button, StyleSheet } from 'react-native';

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApplyFilters: (filters: { priceRange: string; location: string; size: string }) => void;
}

const FilterModal: React.FC<FilterModalProps> = ({ visible, onClose, onApplyFilters }) => {
  const [priceRange, setPriceRange] = useState('');
  const [location, setLocation] = useState('');
  const [size, setSize] = useState('');

  const handleApplyFilters = () => {
    onApplyFilters({ priceRange, location, size });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <Text style={styles.title}>Filter Farmland Listings</Text>
        <TextInput
          style={styles.input}
          placeholder="Price Range"
          value={priceRange}
          onChangeText={setPriceRange}
        />
        <TextInput
          style={styles.input}
          placeholder="Location"
          value={location}
          onChangeText={setLocation}
        />
        <TextInput
          style={styles.input}
          placeholder="Size (Acres)"
          value={size}
          onChangeText={setSize}
        />
        <Button title="Apply Filters" onPress={handleApplyFilters} />
        <Button title="Close" onPress={onClose} color="red" />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
  },
});

export default FilterModal;