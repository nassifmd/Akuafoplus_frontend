import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  TouchableOpacity,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import Icon from "react-native-vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Config from "../../Config/config";

interface FinancialRecord {
  _id: string;
  description: string;
  amount: number;
  type: "Income" | "Expense";
  category: string;
  date: string;
  animalId?: string | null;
  createdBy?: {
    name: string;
    email: string;
    role: string;
  };
  roleAtCreation?: string;
  invoiceNumber?: string;
  paymentMethod?: "Cash" | "Check" | "Credit" | "Transfer";
}

interface FinancialSummary {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  incomeByCategory?: Array<{ category: string; amount: number }>;
  expenseByCategory?: Array<{ category: string; amount: number }>;
}

const FinanceTab = ({ navigation }: { navigation: any }) => {
  // State for date picker
  const [datePickerMode, setDatePickerMode] = useState<"start" | "end" | null>(null);
  
  // Data states
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // UI states
  const [showModal, setShowModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Filter states
  const [filter, setFilter] = useState({
    startDate: null as Date | null,
    endDate: null as Date | null,
    type: "",
    category: "",
  });

  // New record state
  const [newRecord, setNewRecord] = useState({
    description: "",
    amount: "",
    type: "Expense" as "Income" | "Expense",
    category: "Feed",
    date: new Date(),
    animalId: null as string | null,
    paymentMethod: "Cash" as "Cash" | "Check" | "Credit" | "Transfer",
    invoiceNumber: "",
  });

  // Categories configuration - updated to match backend enum
  const categories = {
    Income: ["Livestock Sales", "Milk Sales", "Other Income"],
    Expense: [
      "Feed",
      "Veterinary",
      "Medication",
      "Labor",
      "Equipment",
      "Other Expense"
    ],
  };

  // Payment methods
  const paymentMethods = ["Cash", "Check", "Credit", "Transfer"];

  // Get authorization headers with access token
  const getAuthHeaders = async () => {
    try {
      const accessToken = await AsyncStorage.getItem("accessToken");
      if (!accessToken) {
        throw new Error("No access token found");
      }
      return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      };
    } catch (error) {
      console.error("Error getting auth headers:", error);
      throw error;
    }
  };

  // Handle unauthorized access
  const handleUnauthorized = () => {
    Alert.alert(
      "Session Expired",
      "Your session has expired. Please log in again.",
      [
        {
          text: "OK",
          onPress: () => {
            AsyncStorage.clear().then(() => {
              navigation.reset({
                index: 0,
                routes: [{ name: "LoginScreen" }],
              });
            });
          },
        },
      ]
    );
  };

  // Fetch financial records from API with pagination
  const fetchRecords = async (page = 1) => {
    try {
      setLoading(true);
      let url = `${Config.API_BASE_URL}/financial`;
      const params = [];
      
      if (filter.startDate) params.push(`startDate=${filter.startDate.toISOString()}`);
      if (filter.endDate) params.push(`endDate=${filter.endDate.toISOString()}`);
      if (filter.type) params.push(`type=${filter.type}`);
      if (filter.category) params.push(`category=${filter.category}`);
      params.push(`page=${page}`);
      params.push(`limit=20`);
      
      if (params.length > 0) {
        url += `?${params.join("&")}`;
      }
      
      const headers = await getAuthHeaders();
      const response = await axios.get(url, { headers });
      
      setRecords(response.data.data);
      setCurrentPage(response.data.currentPage);
      setTotalPages(response.data.pages);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          handleUnauthorized();
        } else {
          console.error("Fetch error:", error.response?.data || error.message);
          Alert.alert("Error", error.response?.data?.message || "Failed to fetch financial records");
        }
      } else {
        Alert.alert("Error", "Failed to fetch financial records");
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch financial summary from API
  const fetchSummary = async () => {
    try {
      let url = `${Config.API_BASE_URL}/financial/summary`;
      const params = [];
      
      if (filter.startDate) params.push(`startDate=${filter.startDate.toISOString()}`);
      if (filter.endDate) params.push(`endDate=${filter.endDate.toISOString()}`);
      
      if (params.length > 0) {
        url += `?${params.join("&")}`;
      }
      
      const headers = await getAuthHeaders();
      const response = await axios.get(url, { headers });
      setSummary(response.data.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          handleUnauthorized();
        } else {
          Alert.alert("Error", error.response?.data?.message || "Failed to fetch financial summary");
        }
      } else {
        Alert.alert("Error", "Failed to fetch financial summary");
      }
    }
  };

  // Add new financial record
  const handleAddRecord = async () => {
    try {
      if (!newRecord.description || !newRecord.amount) {
        Alert.alert("Error", "Please fill in all required fields");
        return;
      }

      const headers = await getAuthHeaders();
      const response = await axios.post(
        `${Config.API_BASE_URL}/financial`,
        {
          ...newRecord,
          amount: parseFloat(newRecord.amount),
          date: newRecord.date.toISOString(),
        },
        { headers }
      );
      
      setRecords([response.data.data, ...records]);
      setShowModal(false);
      setNewRecord({
        description: "",
        amount: "",
        type: "Expense",
        category: "Feed",
        date: new Date(),
        animalId: null,
        paymentMethod: "Cash",
        invoiceNumber: "",
      });
      fetchSummary();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          handleUnauthorized();
        } else {
          Alert.alert("Error", error.response?.data?.message || "Failed to add record");
        }
      } else {
        Alert.alert("Error", "An unknown error occurred");
      }
    }
  };

  // Handle date change for filter
  const handleFilterDateChange = (event: any, selectedDate: Date | undefined) => {
    setShowDatePicker(false);
    if (selectedDate) {
      if (datePickerMode === "start") {
        setFilter({...filter, startDate: selectedDate});
      } else if (datePickerMode === "end") {
        setFilter({...filter, endDate: selectedDate});
      }
    }
    setDatePickerMode(null);
  };

  // Handle date change for new record
  const handleRecordDateChange = (event: any, selectedDate: Date | undefined) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setNewRecord({...newRecord, date: selectedDate});
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      fetchRecords(page);
    }
  };

  // Fetch data on component mount and when filter changes
  useEffect(() => {
    fetchRecords();
    fetchSummary();
  }, [filter]);

  return (
    <View style={styles.financeContainer}>
      {/* Filters Section */}
      <View style={styles.filterContainer}>
        {/* Start Date Picker */}
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => {
            setDatePickerMode("start");
            setShowDatePicker(true);
          }}
        >
          <Text>{filter.startDate ? filter.startDate.toDateString() : "Start Date"}</Text>
        </TouchableOpacity>

        {/* End Date Picker */}
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => {
            setDatePickerMode("end");
            setShowDatePicker(true);
          }}
        >
          <Text>{filter.endDate ? filter.endDate.toDateString() : "End Date"}</Text>
        </TouchableOpacity>

        {/* Type Picker */}
        <Picker
          selectedValue={filter.type}
          style={styles.picker}
          onValueChange={(itemValue) => setFilter({...filter, type: itemValue, category: ""})}
        >
          <Picker.Item label="All Types" value="" />
          <Picker.Item label="Income" value="Income" />
          <Picker.Item label="Expense" value="Expense" />
        </Picker>

        {/* Category Picker */}
        <Picker
          selectedValue={filter.category}
          style={styles.picker}
          onValueChange={(itemValue) => setFilter({...filter, category: itemValue})}
        >
          <Picker.Item label="All Categories" value="" />
          {filter.type === "Income" && categories.Income.map(cat => (
            <Picker.Item key={cat} label={cat} value={cat} />
          ))}
          {filter.type === "Expense" && categories.Expense.map(cat => (
            <Picker.Item key={cat} label={cat} value={cat} />
          ))}
          {!filter.type && [...categories.Income, ...categories.Expense].map(cat => (
            <Picker.Item key={cat} label={cat} value={cat} />
          ))}
        </Picker>

        {/* Date Picker Modal */}
        {showDatePicker && (
          <DateTimePicker
            value={datePickerMode === "start" && filter.startDate 
              ? filter.startDate 
              : datePickerMode === "end" && filter.endDate 
                ? filter.endDate 
                : new Date()}
            mode="date"
            display="default"
            onChange={datePickerMode === "start" || datePickerMode === "end" 
              ? handleFilterDateChange 
              : handleRecordDateChange}
          />
        )}
      </View>

      {/* Summary Cards */}
      {summary && (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Income</Text>
            <Text style={[styles.summaryValue, styles.incomeText]}>
              ${summary.totalIncome.toFixed(2)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Expenses</Text>
            <Text style={[styles.summaryValue, styles.expenseText]}>
              ${summary.totalExpense.toFixed(2)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Net Profit</Text>
            <Text style={[styles.summaryValue, 
              summary.netProfit >= 0 ? styles.incomeText : styles.expenseText]}>
              ${summary.netProfit.toFixed(2)}
            </Text>
          </View>
        </View>
      )}

      {/* Records List */}
      {loading ? (
        <ActivityIndicator size="large" color="#00796B" />
      ) : (
        <View style={{ flex: 1 }}>
          <FlatList
            data={records}
            keyExtractor={(item) => item._id}
            ListHeaderComponent={
              <View style={styles.listHeader}>
                <Text style={styles.headerText}>Financial Records</Text>
                <TouchableOpacity 
                  style={styles.addButton}
                  onPress={() => setShowModal(true)}
                >
                  <Icon name="add" size={24} color="white" />
                </TouchableOpacity>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.recordCard}>
                <View style={styles.recordLeft}>
                  <Text style={styles.recordDescription}>{item.description}</Text>
                  <Text style={styles.recordCategory}>{item.category}</Text>
                  <Text style={styles.recordDate}>
                    {new Date(item.date).toLocaleDateString()}
                  </Text>
                  {item.createdBy && (
                    <Text style={styles.recordCreator}>
                      Added by: {item.createdBy.name} ({item.roleAtCreation || item.createdBy.role})
                    </Text>
                  )}
                  {item.invoiceNumber && (
                    <Text style={styles.recordDetail}>
                      Invoice: {item.invoiceNumber}
                    </Text>
                  )}
                </View>
                <View style={styles.recordRight}>
                  <Text 
                    style={[
                      styles.recordAmount,
                      item.type === "Income" ? styles.incomeText : styles.expenseText
                    ]}
                  >
                    {item.type === "Income" ? "+" : "-"}${item.amount.toFixed(2)}
                  </Text>
                  {item.paymentMethod && (
                    <Text style={styles.recordDetail}>
                      {item.paymentMethod}
                    </Text>
                  )}
                </View>
              </View>
            )}
          />
          {/* Pagination Controls */}
          <View style={styles.paginationContainer}>
            <TouchableOpacity
              style={[styles.paginationButton, currentPage === 1 && styles.disabledButton]}
              onPress={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <Text style={styles.paginationText}>Previous</Text>
            </TouchableOpacity>
            <Text style={styles.paginationText}>
              Page {currentPage} of {totalPages}
            </Text>
            <TouchableOpacity
              style={[styles.paginationButton, currentPage === totalPages && styles.disabledButton]}
              onPress={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <Text style={styles.paginationText}>Next</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Add Record Modal */}
      <Modal visible={showModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Financial Record</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Icon name="close" size={24} />
            </TouchableOpacity>
          </View>
          
          <Picker
            selectedValue={newRecord.type}
            onValueChange={(itemValue) => setNewRecord({
              ...newRecord, 
              type: itemValue,
              category: itemValue === "Income" ? "Livestock Sales" : "Feed"
            })}
          >
            <Picker.Item label="Income" value="Income" />
            <Picker.Item label="Expense" value="Expense" />
          </Picker>
          
          <Picker
            selectedValue={newRecord.category}
            onValueChange={(itemValue) => setNewRecord({...newRecord, category: itemValue})}
          >
            {newRecord.type === "Income" 
              ? categories.Income.map(cat => (
                  <Picker.Item key={cat} label={cat} value={cat} />
                ))
              : categories.Expense.map(cat => (
                  <Picker.Item key={cat} label={cat} value={cat} />
                ))
            }
          </Picker>
          
          <TextInput
            style={styles.input}
            placeholder="Description*"
            value={newRecord.description}
            onChangeText={(text) => setNewRecord({...newRecord, description: text})}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Amount*"
            keyboardType="numeric"
            value={newRecord.amount}
            onChangeText={(text) => setNewRecord({...newRecord, amount: text})}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Invoice Number (optional)"
            value={newRecord.invoiceNumber}
            onChangeText={(text) => setNewRecord({...newRecord, invoiceNumber: text})}
          />
          
          <Picker
            selectedValue={newRecord.paymentMethod}
            onValueChange={(itemValue) => setNewRecord({
              ...newRecord,
              paymentMethod: itemValue as "Cash" | "Check" | "Credit" | "Transfer"
            })}
          >
            {paymentMethods.map(method => (
              <Picker.Item key={method} label={method} value={method} />
            ))}
          </Picker>
          
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => {
              setDatePickerMode(null);
              setShowDatePicker(true);
            }}
          >
            <Text>
              Date: {newRecord.date.toDateString()}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleAddRecord}
          >
            <Text style={styles.submitButtonText}>Add Record</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  financeContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  filterContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  filterButton: {
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginBottom: 8,
    minWidth: "48%",
    alignItems: "center",
    justifyContent: "center",
  },
  picker: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    marginBottom: 8,
    minWidth: "48%",
  },
  summaryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
    width: "32%",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "600",
  },
  incomeText: {
    color: "#2E7D32",
  },
  expenseText: {
    color: "#C62828",
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  headerText: {
    fontSize: 18,
    fontWeight: "600",
  },
  addButton: {
    backgroundColor: "#00796B",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  recordCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  recordLeft: {
    flex: 2,
  },
  recordRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  recordDescription: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  recordCategory: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 4,
  },
  recordDate: {
    fontSize: 12,
    color: "#999999",
    marginBottom: 4,
  },
  recordCreator: {
    fontSize: 12,
    color: "#666666",
    marginBottom: 4,
  },
  recordDetail: {
    fontSize: 12,
    color: "#666666",
  },
  recordAmount: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  modalContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: "#F5F5F5",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginBottom: 16,
  },
  dateButton: {
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: "#00796B",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  paginationButton: {
    padding: 10,
    backgroundColor: "#00796B",
    borderRadius: 5,
  },
  disabledButton: {
    backgroundColor: "#B2DFDB",
  },
  paginationText: {
    color: "#FFFFFF",
  },
});

export default FinanceTab;