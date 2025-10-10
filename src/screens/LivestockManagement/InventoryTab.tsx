import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator
} from 'react-native';
import Icon from "react-native-vector-icons/MaterialIcons";
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from '../../Config/config';

const InventoryTab = () => {
    const [inventoryItems, setInventoryItems] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [currentItem, setCurrentItem] = useState<{
      _id: string;
      name: string;
      type: string;
      quantity: number;
      unit: string;
      costPerUnit: number;
      supplier?: string;
      minStockLevel?: number;
      notes?: string;
    } | null>(null);
    const [isQuantityModalVisible, setIsQuantityModalVisible] = useState(false);
    const [quantityAction, setQuantityAction] = useState('');
    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    type: 'Feed',
    quantity: '',
    unit: '',
    costPerUnit: '',
    supplier: '',
    minStockLevel: '',
    notes: ''
  });

  const inventoryTypes = ['Feed', 'Medication', 'Supplement', 'Equipment'];
  const units = ['kg', 'g', 'L', 'ml', 'pieces', 'bags'];

    // Helper function to get token
    const getAccessToken = async () => {
        try {
            const token = await AsyncStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found');
            }
            return token;
        } catch (error) {
            console.error('Error getting token:', error);
            throw error;
        }
      };

  useEffect(() => {
    fetchInventoryItems();
  }, []);

const fetchInventoryItems = async () => {
  setIsLoading(true);
  try {
    const token = await getAccessToken();
    console.log('Fetching inventory items with token:', token);
    
    const response = await axios.get(`${Config.API_BASE_URL}/inventory`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Inventory response:', response.data);
    // Update this line to use response.data.data instead of response.data
    setInventoryItems(response.data.data || []);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', {
        message: error.message,
        code: error.code,
        response: error.response,
        config: error.config
      });
      Alert.alert('Error', error.response?.data?.message || 'Failed to fetch inventory items');
    } else {
      Alert.alert('Error', 'Failed to fetch inventory items');
    }
    setInventoryItems([]);
  } finally {
    setIsLoading(false);
  }
};

interface FormData {
    name: string;
    type: string;
    quantity: string;
    unit: string;
    costPerUnit: string;
    supplier: string;
    minStockLevel: string;
    notes: string;
}

const handleInputChange = (name: keyof FormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

const resetForm = () => {
    setFormData({
      name: '',
      type: 'Feed',
      quantity: '',
      unit: '',
      costPerUnit: '',
      supplier: '',
      minStockLevel: '',
      notes: ''
    });
    setCurrentItem(null);
    setIsEditMode(false);
  };

  const handleSubmit = async () => {
    try {
      const token = await getAccessToken();
      if (isEditMode && currentItem) {
        await axios.put(`${Config.API_BASE_URL}/inventory/${currentItem._id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${Config.API_BASE_URL}/inventory`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      fetchInventoryItems();
      setIsModalVisible(false);
      resetForm();
    } catch (error) {
      const errorMessage = (error as any)?.response?.data?.error || 'Failed to save inventory item';
      Alert.alert('Error', errorMessage);
      console.error(error);
    }
  };

  interface InventoryItem {
    _id: string;
    name: string;
    type: string;
    quantity: number;
    unit: string;
    costPerUnit: number;
    supplier?: string;
    minStockLevel?: number;
    notes?: string;
  }

const handleEdit = (item: InventoryItem) => {
    setCurrentItem(item);
    setFormData({
      name: item.name,
      type: item.type,
      quantity: item.quantity.toString(),
      unit: item.unit,
      costPerUnit: item.costPerUnit.toString(),
      supplier: item.supplier || '',
      minStockLevel: item.minStockLevel?.toString() || '',
      notes: item.notes || ''
    });
    setIsEditMode(true);
    setIsModalVisible(true);
  };

const handleDelete = async (id: string) => {
  try {
    const token = await getAccessToken();
    const response = await axios.delete(
      `${Config.API_BASE_URL}/inventory/${id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    if (response.data.success) {
      Alert.alert('Success', response.data.message);
      fetchInventoryItems();
    } else {
      Alert.alert('Error', response.data.message);
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Full delete error:', error.response?.data || error.message);
      Alert.alert(
        'Error', 
        error.response?.data?.message || 'Failed to delete item'
      );
    } else {
      console.error('Full delete error:', error);
      Alert.alert('Error', 'Failed to delete item');
    }
  }
};

const handleQuantityUpdate = async () => {
    try {
      if (currentItem) {
        const token = await getAccessToken();
        await axios.post(
          `${Config.API_BASE_URL}/inventory/${currentItem._id}/quantity`,
          {
            action: quantityAction,
            amount: parseFloat(amount)
          },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        fetchInventoryItems();
        setIsQuantityModalVisible(false);
        setAmount('');
      } else {
        Alert.alert('Error', 'No item selected for quantity update');
      }
    } catch (error) {
      const errorMessage = (error as any)?.response?.data?.error || 'Failed to update quantity';
      Alert.alert('Error', errorMessage);
      console.error(error);
    }
  };

  const renderItem = ({ item }: { item: InventoryItem }) => (
    <View style={styles.itemContainer}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemType}>{item.type}</Text>
        <Text style={styles.itemQuantity}>
          {item.quantity} {item.unit} {item.minStockLevel && `(Min: ${item.minStockLevel})`}
        </Text>
        {item.quantity <= (item.minStockLevel || 0) && (
          <Text style={styles.lowStock}>Low Stock!</Text>
        )}
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity 
          onPress={() => {
            setCurrentItem(item);
            setQuantityAction('use');
            setIsQuantityModalVisible(true);
          }}
          style={styles.actionButton}
        >
          <Icon name="remove" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => {
            setCurrentItem(item);
            setQuantityAction('restock');
            setIsQuantityModalVisible(true);
          }}
          style={styles.actionButton}
        >
          <Icon name="add" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => handleEdit(item)}
          style={styles.actionButton}
        >
          <Icon name="create" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => handleDelete(item._id)}
          style={[styles.actionButton, { backgroundColor: '#dc3545' }]}
        >
          <Icon name="delete" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => {
          resetForm();
          setIsModalVisible(true);
        }}
      >
        <Icon name="add" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Add Inventory Item</Text>
      </TouchableOpacity>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text>Loading inventory...</Text>
        </View>
      ) : inventoryItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="inventory" size={50} color="#6c757d" />
          <Text style={styles.emptyText}>No inventory items found</Text>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={fetchInventoryItems}
          >
            <Icon name="refresh" size={20} color="#fff" />
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
      <FlatList
        data={inventoryItems}
        renderItem={renderItem}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContent}
        refreshing={isLoading}
        onRefresh={fetchInventoryItems}
      />
      )}
      {/* Add/Edit Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        onRequestClose={() => {
          setIsModalVisible(false);
          resetForm();
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {isEditMode ? 'Edit Inventory Item' : 'Add New Inventory Item'}
            </Text>
            <TouchableOpacity 
              onPress={() => {
                setIsModalVisible(false);
                resetForm();
              }}
            >
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => handleInputChange('name', text)}
              placeholder="Item name"
            />

            <Text style={styles.label}>Type</Text>
            <View style={styles.radioGroup}>
              {inventoryTypes.map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.radioButton,
                    formData.type === type && styles.radioButtonSelected
                  ]}
                  onPress={() => handleInputChange('type', type)}
                >
                  <Text style={formData.type === type ? styles.radioTextSelected : styles.radioText}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Quantity</Text>
            <TextInput
              style={styles.input}
              value={formData.quantity}
              onChangeText={(text) => handleInputChange('quantity', text)}
              placeholder="Current quantity"
              keyboardType="numeric"
            />

            <Text style={styles.label}>Unit</Text>
            <View style={styles.radioGroup}>
              {units.map(unit => (
                <TouchableOpacity
                  key={unit}
                  style={[
                    styles.radioButton,
                    formData.unit === unit && styles.radioButtonSelected
                  ]}
                  onPress={() => handleInputChange('unit', unit)}
                >
                  <Text style={formData.unit === unit ? styles.radioTextSelected : styles.radioText}>
                    {unit}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Cost per Unit</Text>
            <TextInput
              style={styles.input}
              value={formData.costPerUnit}
              onChangeText={(text) => handleInputChange('costPerUnit', text)}
              placeholder="Cost per unit"
              keyboardType="numeric"
            />

            <Text style={styles.label}>Supplier</Text>
            <TextInput
              style={styles.input}
              value={formData.supplier}
              onChangeText={(text) => handleInputChange('supplier', text)}
              placeholder="Supplier name"
            />

            <Text style={styles.label}>Minimum Stock Level</Text>
            <TextInput
              style={styles.input}
              value={formData.minStockLevel}
              onChangeText={(text) => handleInputChange('minStockLevel', text)}
              placeholder="Minimum stock level"
              keyboardType="numeric"
            />

            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, { height: 80 }]}
              value={formData.notes}
              onChangeText={(text) => handleInputChange('notes', text)}
              placeholder="Additional notes"
              multiline
            />

            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleSubmit}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Quantity Update Modal */}
      <Modal
        visible={isQuantityModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsQuantityModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.quantityModal}>
            <Text style={styles.quantityModalTitle}>
              {quantityAction === 'use' ? 'Use Item' : 'Restock Item'}
            </Text>
            <Text style={styles.quantityModalItem}>{currentItem?.name}</Text>
            <Text style={styles.quantityModalCurrent}>
              Current: {currentItem?.quantity} {currentItem?.unit}
            </Text>

            <TextInput
              style={styles.quantityInput}
              value={amount}
              onChangeText={setAmount}
              placeholder={`Amount to ${quantityAction}`}
              keyboardType="numeric"
            />

            <View style={styles.quantityModalButtons}>
              <TouchableOpacity
                style={[styles.quantityButton, { backgroundColor: '#6c757d' }]}
                onPress={() => setIsQuantityModalVisible(false)}
              >
                <Text style={styles.quantityButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quantityButton, { backgroundColor: '#28a745' }]}
                onPress={handleQuantityUpdate}
              >
                <Text style={styles.quantityButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: '#f8f9fa',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 5,
    marginBottom: 15,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 10,
  },
  listContent: {
    paddingBottom: 20,
  },
  itemContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  itemInfo: {
    marginBottom: 10,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  itemType: {
    color: '#6c757d',
    marginBottom: 5,
  },
  itemQuantity: {
    fontSize: 16,
    marginBottom: 5,
  },
  lowStock: {
    color: '#dc3545',
    fontWeight: 'bold',
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: '#007bff',
    padding: 8,
    borderRadius: 5,
    width: 40,
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  formContainer: {
    flex: 1,
  },
  label: {
    marginBottom: 5,
    fontWeight: 'bold',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  radioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  radioButton: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    padding: 8,
    marginRight: 10,
    marginBottom: 10,
  },
  radioButtonSelected: {
    borderColor: '#007bff',
    backgroundColor: '#e7f1ff',
  },
  radioText: {
    color: '#333',
  },
  radioTextSelected: {
    color: '#007bff',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  quantityModal: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '80%',
  },
  quantityModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  quantityModalItem: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  quantityModalCurrent: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#6c757d',
  },
  quantityInput: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    padding: 10,
    marginBottom: 20,
    fontSize: 16,
  },
  quantityModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quantityButton: {
    padding: 10,
    borderRadius: 5,
    width: '48%',
    alignItems: 'center',
  },
  quantityButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
    loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#6c757d',
    marginVertical: 10,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 5,
    marginTop: 20,
  },
  refreshButtonText: {
    color: '#fff',
    marginLeft: 10,
  },
});

export default InventoryTab;