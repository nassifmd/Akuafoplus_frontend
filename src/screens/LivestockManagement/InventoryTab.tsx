import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator,
  ScrollView, StatusBar
} from 'react-native';
import Icon from "react-native-vector-icons/MaterialIcons";
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from '../../Config/config';

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

const InventoryTab = () => {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentItem, setCurrentItem] = useState<InventoryItem | null>(null);
  const [isQuantityModalVisible, setIsQuantityModalVisible] = useState(false);
  const [quantityAction, setQuantityAction] = useState('');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [formData, setFormData] = useState<FormData>({
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

  const getAccessToken = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) throw new Error('No access token found');
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
    try {
      const token = await getAccessToken();
      const response = await axios.get(`${Config.API_BASE_URL}/inventory`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInventoryItems(response.data.data || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      if (axios.isAxiosError(error)) {
        Alert.alert('Error', error.response?.data?.message || 'Failed to fetch inventory items');
      } else {
        Alert.alert('Error', 'Failed to fetch inventory items');
      }
      setInventoryItems([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchInventoryItems();
  };

  const handleInputChange = (name: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
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
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter an item name');
      return;
    }

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
    }
  };

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
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getAccessToken();
              const response = await axios.delete(
                `${Config.API_BASE_URL}/inventory/${id}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              
              if (response.data.success) {
                Alert.alert('Success', response.data.message);
                fetchInventoryItems();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete item');
            }
          }
        }
      ]
    );
  };

  const handleQuantityUpdate = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      if (currentItem) {
        const token = await getAccessToken();
        await axios.post(
          `${Config.API_BASE_URL}/inventory/${currentItem._id}/quantity`,
          { action: quantityAction, amount: parseFloat(amount) },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        fetchInventoryItems();
        setIsQuantityModalVisible(false);
        setAmount('');
      }
    } catch (error) {
      const errorMessage = (error as any)?.response?.data?.error || 'Failed to update quantity';
      Alert.alert('Error', errorMessage);
    }
  };

  const getTypeColor = (type: string) => {
    const colors = {
      Feed: '#10b981',
      Medication: '#ef4444',
      Supplement: '#f59e0b',
      Equipment: '#3b82f6'
    };
    return colors[type as keyof typeof colors] || '#6b7280';
  };

  const renderItem = ({ item }: { item: InventoryItem }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={[styles.typeIndicator, { backgroundColor: getTypeColor(item.type) }]} />
        <View style={styles.itemTitleContainer}>
          <Text style={styles.itemName}>{item.name}</Text>
          <View style={styles.typeBadge}>
            <Text style={[styles.typeText, { color: getTypeColor(item.type) }]}>
              {item.type}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.itemDetails}>
        <View style={styles.quantitySection}>
          <Text style={styles.quantityText}>
            {item.quantity} {item.unit}
          </Text>
          {item.minStockLevel && (
            <Text style={styles.minStockText}>
              Min: {item.minStockLevel}
            </Text>
          )}
        </View>

        {item.quantity <= (item.minStockLevel || 0) && (
          <View style={styles.lowStockBadge}>
            <Icon name="warning" size={14} color="#fff" />
            <Text style={styles.lowStockText}>Low Stock</Text>
          </View>
        )}
      </View>

      {item.supplier && (
        <Text style={styles.supplierText}>Supplier: {item.supplier}</Text>
      )}

      <View style={styles.actionBar}>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.useBtn]}
          onPress={() => {
            setCurrentItem(item);
            setQuantityAction('use');
            setIsQuantityModalVisible(true);
          }}
        >
          <Icon name="remove" size={18} color="#fff" />
          <Text style={styles.actionBtnText}>Use</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionBtn, styles.restockBtn]}
          onPress={() => {
            setCurrentItem(item);
            setQuantityAction('restock');
            setIsQuantityModalVisible(true);
          }}
        >
          <Icon name="add" size={18} color="#fff" />
          <Text style={styles.actionBtnText}>Restock</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionBtn, styles.editBtn]}
          onPress={() => handleEdit(item)}
        >
          <Icon name="edit" size={16} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={() => handleDelete(item._id)}
        >
          <Icon name="delete" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Inventory Management</Text>
        <Text style={styles.headerSubtitle}>
          {inventoryItems.length} items total
        </Text>
      </View>

      {/* Add Item Button */}
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => {
          resetForm();
          setIsModalVisible(true);
        }}
      >
        <View style={styles.addButtonContent}>
          <Icon name="add" size={22} color="#fff" />
          <Text style={styles.addButtonText}>Add New Item</Text>
        </View>
      </TouchableOpacity>

      {/* Inventory List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading inventory...</Text>
        </View>
      ) : inventoryItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="inventory" size={80} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No Inventory Items</Text>
          <Text style={styles.emptySubtitle}>
            Get started by adding your first inventory item
          </Text>
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
          refreshing={refreshing}
          onRefresh={handleRefresh}
          showsVerticalScrollIndicator={false}
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
        <ScrollView>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {isEditMode ? 'Edit Item' : 'Add New Item'}
            </Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => {
                setIsModalVisible(false);
                resetForm();
              }}
            >
              <Icon name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formSection}>
              <Text style={styles.label}>Item Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => handleInputChange('name', text)}
                placeholder="Enter item name"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.label}>Category</Text>
              <View style={styles.categoryGrid}>
                {inventoryTypes.map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.categoryButton,
                      formData.type === type && [
                        styles.categoryButtonSelected,
                        { borderColor: getTypeColor(type) }
                      ]
                    ]}
                    onPress={() => handleInputChange('type', type)}
                  >
                    <Text style={[
                      styles.categoryText,
                      formData.type === type && [
                        styles.categoryTextSelected,
                        { color: getTypeColor(type) }
                      ]
                    ]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Quantity</Text>
                <TextInput
                  style={styles.input}
                  value={formData.quantity}
                  onChangeText={(text) => handleInputChange('quantity', text)}
                  placeholder="0"
                  keyboardType="numeric"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Unit</Text>
                <View style={styles.unitSelector}>
                  {units.map(unit => (
                    <TouchableOpacity
                      key={unit}
                      style={[
                        styles.unitButton,
                        formData.unit === unit && styles.unitButtonSelected
                      ]}
                      onPress={() => handleInputChange('unit', unit)}
                    >
                      <Text style={[
                        styles.unitText,
                        formData.unit === unit && styles.unitTextSelected
                      ]}>
                        {unit}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.label}>Cost per Unit</Text>
              <TextInput
                style={styles.input}
                value={formData.costPerUnit}
                onChangeText={(text) => handleInputChange('costPerUnit', text)}
                placeholder="0.00"
                keyboardType="numeric"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.label}>Supplier</Text>
              <TextInput
                style={styles.input}
                value={formData.supplier}
                onChangeText={(text) => handleInputChange('supplier', text)}
                placeholder="Supplier name"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.label}>Minimum Stock Level</Text>
              <TextInput
                style={styles.input}
                value={formData.minStockLevel}
                onChangeText={(text) => handleInputChange('minStockLevel', text)}
                placeholder="Set minimum stock level"
                keyboardType="numeric"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.notes}
                onChangeText={(text) => handleInputChange('notes', text)}
                placeholder="Additional notes..."
                multiline
                numberOfLines={4}
                placeholderTextColor="#94a3b8"
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleSubmit}
            >
              <Text style={styles.saveButtonText}>
                {isEditMode ? 'Update Item' : 'Add Item'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
        </ScrollView>
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
            <View style={styles.quantityModalHeader}>
              <Icon 
                name={quantityAction === 'use' ? 'remove' : 'add'} 
                size={24} 
                color={quantityAction === 'use' ? '#ef4444' : '#10b981'} 
              />
              <Text style={styles.quantityModalTitle}>
                {quantityAction === 'use' ? 'Use Item' : 'Restock Item'}
              </Text>
            </View>

            <Text style={styles.quantityModalItem}>{currentItem?.name}</Text>
            <Text style={styles.quantityModalCurrent}>
              Current stock: {currentItem?.quantity} {currentItem?.unit}
            </Text>

            <TextInput
              style={styles.quantityInput}
              value={amount}
              onChangeText={setAmount}
              placeholder={`Enter amount to ${quantityAction}`}
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
            />

            <View style={styles.quantityModalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsQuantityModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  { backgroundColor: quantityAction === 'use' ? '#ef4444' : '#10b981' }
                ]}
                onPress={handleQuantityUpdate}
              >
                <Text style={styles.confirmButtonText}>
                  {quantityAction === 'use' ? 'Use' : 'Restock'}
                </Text>
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
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 20,
    paddingTop: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  addButton: {
    margin: 20,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  addButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  listContent: {
    padding: 16,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeIndicator: {
    width: 4,
    height: 24,
    borderRadius: 2,
    marginRight: 12,
  },
  itemTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  typeBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quantitySection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginRight: 12,
  },
  minStockText: {
    fontSize: 14,
    color: '#64748b',
  },
  lowStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  lowStockText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  supplierText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
  },
  actionBar: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1,
  },
  useBtn: {
    backgroundColor: '#ef4444',
  },
  restockBtn: {
    backgroundColor: '#10b981',
  },
  editBtn: {
    backgroundColor: '#3b82f6',
    flex: 0.5,
  },
  deleteBtn: {
    backgroundColor: '#64748b',
    flex: 0.5,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 12,
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#475569',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: '500',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formSection: {
    marginBottom: 20,
  },
  formRow: {
    flexDirection: 'row',
    gap: 16,
  },
  formGroup: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1e293b',
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 80,
  },
  categoryButtonSelected: {
    borderWidth: 2,
    backgroundColor: '#f8fafc',
  },
  categoryText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
  },
  categoryTextSelected: {
    fontWeight: '600',
  },
  unitSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  unitButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  unitButtonSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#dbeafe',
  },
  unitText: {
    fontSize: 12,
    color: '#64748b',
  },
  unitTextSelected: {
    color: '#3b82f6',
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  quantityModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  quantityModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  quantityModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 8,
  },
  quantityModalItem: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  quantityModalCurrent: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
  },
  quantityInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1e293b',
    marginBottom: 24,
  },
  quantityModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#64748b',
    fontWeight: '500',
  },
  confirmButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
});

export default InventoryTab;