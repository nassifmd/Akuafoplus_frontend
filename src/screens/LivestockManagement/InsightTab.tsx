import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
  Alert,
  ScrollView,
  Dimensions
} from 'react-native';
import { 
  Card, 
  Chip, 
  Searchbar, 
  Menu, 
  Divider, 
  Button, 
  TextInput, 
  Modal, 
  Portal,
  Dialog,
  Avatar,
  IconButton
} from 'react-native-paper';
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
const Icon = MaterialCommunityIcons;
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from '../../Config/config';
import { format, parseISO } from 'date-fns';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

// Types
interface RelatedEntity {
  entityId?: string;
  entityType: string;
  referenceId?: string;
  _id?: string;
}

interface Insight {
  _id: string;
  type: string;
  title?: string;
  description?: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';
  timePeriod?: {
    startDate: string;
    endDate: string;
  };
  data: any;
  filters?: Record<string, any>;
  isActionable: boolean;
  recommendedActions?: string[];
  createdBy: string;
  roleAtCreation: string;
  relatedEntities?: RelatedEntity[];
  createdAt: string;
  updatedAt?: string;
  __v?: number;
  actionTaken?: string;
  actionNotes?: string;
  actionDate?: string;
}

const InsightTab = () => {
  // State management
  const [insights, setInsights] = useState<Insight[]>([]);
  const [filteredInsights, setFilteredInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('All');
  const [menuVisible, setMenuVisible] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [currentInsight, setCurrentInsight] = useState<Insight | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [newInsightData, setNewInsightData] = useState({
    type: 'HealthAnalysis',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    filters: { breed: '', status: '' }
  });
  const [typeMenuVisible, setTypeMenuVisible] = useState(false);
  const [expandedInsightId, setExpandedInsightId] = useState<string | null>(null);

  // Constants
  const insightTypes = [
    { label: 'Health Analysis', value: 'HealthAnalysis', icon: 'heart-pulse' },
    { label: 'Growth Performance', value: 'GrowthPerformance', icon: 'chart-line' },
    { label: 'Breeding Success', value: 'BreedingSuccess', icon: 'baby-face' },
    { label: 'Fattening Efficiency', value: 'FatteningEfficiency', icon: 'weight' },
    { label: 'Herd Inventory', value: 'HerdInventory', icon: 'cow' }
  ];

  const severityLevels = ['Critical', 'High', 'Medium', 'Low', 'Info'];

  // Effects
  useEffect(() => {
    const getToken = async () => {
      const token = await AsyncStorage.getItem('accessToken');
      setAccessToken(token);
    };
    getToken();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (accessToken) {
        fetchInsights();
      }
    }, [accessToken])
  );

  // API Functions
  const fetchInsights = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${Config.API_BASE_URL}/livestock-insights`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      setInsights(response.data.data);
      setFilteredInsights(response.data.data);
      console.log('Fetched insights:', response.data.data);
    } catch (error) {
      console.error('Error fetching insights:', error);
      Alert.alert('Error', 'Failed to fetch insights. Please try again later.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Helper Functions
  const handleRefresh = () => {
    setRefreshing(true);
    fetchInsights();
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    filterInsights(query, selectedType, selectedSeverity);
  };

  const filterInsights = (query: string, type: string, severity: string) => {
    let filtered = [...insights];
    
    if (query) {
      filtered = filtered.filter(insight => 
        insight.type.toLowerCase().includes(query.toLowerCase()) ||
        (insight.title?.toLowerCase().includes(query.toLowerCase())) ||
        (insight.description?.toLowerCase().includes(query.toLowerCase())) ||
        JSON.stringify(insight.data).toLowerCase().includes(query.toLowerCase())
      );
    }
    
    if (type !== 'All') {
      filtered = filtered.filter(insight => insight.type === type);
    }
    
    if (severity !== 'All') {
      filtered = filtered.filter(insight => insight.severity === severity);
    }
    
    setFilteredInsights(filtered);
  };

  const handleTypeSelect = (type: string) => {
    setSelectedType(type);
    setMenuVisible(false);
    filterInsights(searchQuery, type, selectedSeverity);
  };

  const handleSeveritySelect = (severity: string) => {
    setSelectedSeverity(severity);
    filterInsights(searchQuery, selectedType, severity);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return '#d32f2f';
      case 'High': return '#f57c00';
      case 'Medium': return '#ffa000';
      case 'Low': return '#689f38';
      case 'Info': return '#0288d1';
      default: return '#0288d1';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'alert-circle';
      case 'High': return 'alert';
      case 'Medium': return 'alert-outline';
      case 'Low': return 'information-outline';
      case 'Info': return 'information';
      default: return 'information';
    }
  };

  const toggleInsightExpand = (id: string) => {
    setExpandedInsightId(expandedInsightId === id ? null : id);
  };

  // Action Functions
  const generateNewInsight = async () => {
    try {
      setLoading(true);
      const response = await axios.post(
        `${Config.API_BASE_URL}/livestock-insights`,
        {
          startDate: newInsightData.startDate,
          endDate: newInsightData.endDate,
          insightType: newInsightData.type,
          filters: Object.fromEntries(
            Object.entries(newInsightData.filters).filter(([_, v]) => v !== '')
          )
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      Alert.alert('Success', 'New insight generated successfully');
      setModalVisible(false);
      setNewInsightData({
        type: 'HealthAnalysis',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd'),
        filters: { breed: '', status: '' }
      });
      fetchInsights();
    } catch (error: any) {
      console.error('Error generating insight:', error);
      Alert.alert(
        'Error', 
        error.response?.data?.message || 'Failed to generate insight. Please check your inputs and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const markInsightAsActioned = async () => {
    if (!currentInsight) return;

    try {
      setLoading(true);
      const response = await axios.put(
        `${Config.API_BASE_URL}/livestock-insights/${currentInsight._id}/action`,
        {
          actionTaken,
          notes: actionNotes
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      Alert.alert('Success', 'Action has been recorded for this insight');
      setActionModalVisible(false);
      setActionTaken('');
      setActionNotes('');
      fetchInsights();
    } catch (error: any) {
      console.error('Error updating insight:', error);
      Alert.alert(
        'Error', 
        error.response?.data?.message || 'Failed to update insight. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const deleteInsight = async () => {
    if (!currentInsight) return;

    try {
      setLoading(true);
      await axios.delete(
        `${Config.API_BASE_URL}/livestock-insights/${currentInsight._id}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      Alert.alert('Success', 'Insight deleted successfully');
      setDeleteDialogVisible(false);
      fetchInsights();
    } catch (error: any) {
      console.error('Error deleting insight:', error);
      Alert.alert(
        'Error', 
        error.response?.data?.message || 'Failed to delete insight. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const openActionModal = (insight: Insight) => {
    setCurrentInsight(insight);
    setActionNotes(insight.actionNotes || '');
    setActionTaken(insight.actionTaken || '');
    setActionModalVisible(true);
  };

  const openDeleteDialog = (insight: Insight) => {
    setCurrentInsight(insight);
    setDeleteDialogVisible(true);
  };

  // Render Functions
  const renderHealthAnalysis = (insight: Insight) => {
    if (insight.title) {
      return (
        <>
          <Text style={styles.insightTitle}>{insight.title}</Text>
          <Text style={styles.insightDescription}>{insight.description}</Text>
          
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Health Issue Details</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Issue:</Text>
              <Text style={styles.detailValue}>{insight.data?.issue || 'Unknown'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Occurrences:</Text>
              <Text style={styles.detailValue}>{insight.data?.occurrences || 0}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total Cost:</Text>
              <Text style={styles.detailValue}>${insight.data?.totalCost?.toFixed(2) || '0.00'}</Text>
            </View>
            
            {insight.data?.treatments?.length > 0 && (
              <View style={styles.listContainer}>
                <Text style={styles.sectionTitle}>Treatments Applied:</Text>
                {insight.data.treatments.map((treatment: string, index: number) => (
                  <Text key={index} style={styles.listItem}>• {treatment}</Text>
                ))}
              </View>
            )}
          </View>
        </>
      );
    }

    return (
      <>
        {Array.isArray(insight.data) && insight.data.map((breedData: any, index: number) => (
          <View key={index} style={styles.breedContainer}>
            <Text style={styles.breedTitle}>{breedData.breed || 'All Breeds'}</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total Cases:</Text>
              <Text style={styles.detailValue}>{breedData.totalCases || 0}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total Cost:</Text>
              <Text style={styles.detailValue}>${breedData.totalCost?.toFixed(2) || '0.00'}</Text>
            </View>
            
            <Text style={styles.sectionTitle}>Health Issues:</Text>
            {breedData.healthIssues?.map((issue: any, i: number) => (
              <View key={i} style={styles.issueItem}>
                <Text style={styles.issueText}>• {issue.issue || 'Unknown'}</Text>
                <View style={styles.issueDetails}>
                  <Text style={styles.issueCount}>{issue.occurrences} cases</Text>
                  <Text style={styles.issueCost}>${issue.totalCost?.toFixed(2)}</Text>
                </View>
              </View>
            ))}
          </View>
        ))}
      </>
    );
  };

  const renderInsightDetails = (insight: Insight) => {
    if (!insight.data) return <Text style={styles.noDataText}>No data available</Text>;

    switch (insight.type) {
      case 'HealthAnalysis':
        return renderHealthAnalysis(insight);
      default:
        return (
          <View style={styles.dataContainer}>
            <Text style={styles.detailText}>
              {JSON.stringify(insight.data, null, 2)}
            </Text>
          </View>
        );
    }
  };

  const renderRecommendedActions = (actions?: string[]) => {
    if (!actions || actions.length === 0) return null;

    return (
      <View style={styles.actionsContainer}>
        <Text style={styles.sectionTitle}>Recommended Actions:</Text>
        {actions.map((action, index) => (
          <View key={index} style={styles.actionItem}>
            <MaterialIcons name="check-circle" size={16} color="#4CAF50" style={styles.actionIcon} />
            <Text style={styles.actionText}>{action}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderRelatedEntities = (entities?: RelatedEntity[]) => {
    if (!entities || entities.length === 0) return null;

    return (
      <View style={styles.relatedEntitiesContainer}>
        <Text style={styles.sectionTitle}>Related Entities:</Text>
        <View style={styles.entitiesGrid}>
          {entities.map((entity, index) => (
            <View key={index} style={styles.entityItem}>
              <Icon 
                name={getEntityIcon(entity.entityType)} 
                size={14} 
                color="#757575" 
                style={styles.entityIcon}
              />
              <View>
                <Text style={styles.entityType}>{entity.entityType}:</Text>
                <Text style={styles.entityId}>{entity.entityId || entity.referenceId}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType.toLowerCase()) {
      case 'animal': return 'paw';
      case 'herd': return 'group';
      case 'treatment': return 'medkit';
      case 'facility': return 'home';
      case 'user': return 'user';
      default: return 'tag';
    }
  };

  const renderActionButton = (insight: Insight) => {
    if (!insight.isActionable) return null;

    return (
      <Button 
        mode="contained" 
        onPress={() => openActionModal(insight)}
        style={styles.actionButton}
        labelStyle={styles.actionButtonText}
        icon={() => <Icon name={insight.actionTaken ? "update" : "check-circle"} size={20} color="white" />}
      >
        {insight.actionTaken ? 'Update Action' : 'Mark as Actioned'}
      </Button>
    );
  };

  const renderDeleteButton = (insight: Insight) => {
    return (
      <Button 
        mode="outlined" 
        onPress={() => openDeleteDialog(insight)}
        style={styles.deleteButton}
        labelStyle={styles.deleteButtonText}
        icon={() => <Icon name="delete" size={20} color="#d32f2f" />}
      >
        Delete
      </Button>
    );
  };

  const renderInsightItem = ({ item }: { item: Insight }) => {
    const startDate = item.timePeriod?.startDate ? format(parseISO(item.timePeriod.startDate), 'MMM d, yyyy') : 'N/A';
    const endDate = item.timePeriod?.endDate ? format(parseISO(item.timePeriod.endDate), 'MMM d, yyyy') : 'N/A';
    const createdAt = item.createdAt ? format(parseISO(item.createdAt), 'MMM d, yyyy h:mm a') : 'N/A';
    const actionDate = item.actionDate ? format(parseISO(item.actionDate), 'MMM d, yyyy h:mm a') : null;
    const isExpanded = expandedInsightId === item._id;

    return (
      <Card style={[styles.card, isExpanded && styles.expandedCard]}>
        <Card.Content>
          <TouchableOpacity onPress={() => toggleInsightExpand(item._id)}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Avatar.Icon 
                  size={40} 
                  icon={() => <Icon 
                    name={insightTypes.find(t => t.value === item.type)?.icon || 'help'} 
                    size={24} 
                    color="#4CAF50" 
                  />}
                  style={styles.typeAvatar}
                />
                <View style={styles.cardHeaderText}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {insightTypes.find(t => t.value === item.type)?.label || item.type}
                  </Text>
                  {item.timePeriod && (
                    <Text style={styles.dateText}>
                      {startDate} - {endDate}
                    </Text>
                  )}
                </View>
              </View>
              
              <View style={styles.severityContainer}>
                <Icon 
                  name={getSeverityIcon(item.severity)} 
                  size={20} 
                  color={getSeverityColor(item.severity)} 
                />
                <Chip 
                  textStyle={{ color: 'white', fontSize: 12 }}
                  style={[
                    styles.severityChip, 
                    { backgroundColor: getSeverityColor(item.severity) }
                  ]}
                >
                  {item.severity || 'Unknown'}
                </Chip>
                <IconButton
                  icon={() => <Icon name={isExpanded ? "chevron-up" : "chevron-down"} size={20} />}
                  size={20}
                  onPress={() => toggleInsightExpand(item._id)}
                />
              </View>
            </View>
          </TouchableOpacity>

          {isExpanded && (
            <>
              {item.title && <Divider style={styles.cardDivider} />}

              {/* Title and Description */}
              {item.title && (
                <View style={styles.titleContainer}>
                  <Text style={styles.insightTitle}>{item.title}</Text>
                  {item.description && (
                    <Text style={styles.insightDescription}>{item.description}</Text>
                  )}
                </View>
              )}

              {/* Filters */}
              {item.filters && Object.keys(item.filters).length > 0 && (
                <View style={styles.filtersContainer}>
                  <Text style={styles.sectionTitle}>Filters:</Text>
                  <View style={styles.filterChipsContainer}>
                    {Object.entries(item.filters).map(([key, value]) => (
                      <Chip 
                        key={key} 
                        style={styles.filterChipSmall}
                        textStyle={styles.filterChipSmallText}
                      >
                        {key}: {String(value)}
                      </Chip>
                    ))}
                  </View>
                </View>
              )}

              {/* Insight Data */}
              <View style={styles.dataContainer}>
                {renderInsightDetails(item)}
              </View>

              {/* Recommended Actions */}
              {renderRecommendedActions(item.recommendedActions)}

              {/* Related Entities */}
              {renderRelatedEntities(item.relatedEntities)}

              {/* Action Taken */}
              {item.actionTaken && (
                <View style={styles.actionTakenContainer}>
                  <Text style={styles.sectionTitle}>Action Taken:</Text>
                  <Text style={styles.actionTakenText}>{item.actionTaken}</Text>
                  {item.actionNotes && (
                    <>
                      <Text style={styles.sectionTitle}>Notes:</Text>
                      <Text style={styles.actionNotesText}>{item.actionNotes}</Text>
                    </>
                  )}
                  {actionDate && (
                    <Text style={styles.actionDateText}>Actioned on: {actionDate}</Text>
                  )}
                </View>
              )}

              {/* Footer */}
              <View style={styles.cardFooter}>
                <View style={styles.metadataContainer}>
                  <View style={styles.metadataItem}>
                    <Icon name="timer" size={14} color="#757575" />
                    <Text style={styles.createdAtText}>Created: {createdAt}</Text>
                  </View>
                  <View style={styles.metadataItem}>
                    <Icon name="account" size={14} color="#757575" />
                    <Text style={styles.roleText}>By: {item.roleAtCreation}</Text>
                  </View>
                </View>
                <View style={styles.footerButtons}>
                  {renderActionButton(item)}
                  {renderDeleteButton(item)}
                </View>
              </View>
            </>
          )}
        </Card.Content>
      </Card>
    );
  };

  // Main Render
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading Insights...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Livestock Insights</Text>
        <Text style={styles.headerSubtitle}>Actionable analytics for your herd</Text>
      </View>

      {/* Search and Filters */}
      <View style={styles.filterContainer}>
        <Searchbar
          placeholder="Search insights..."
          onChangeText={handleSearch}
          value={searchQuery}
          style={styles.searchBar}
          iconColor="#4CAF50"
          placeholderTextColor="#999"
          inputStyle={styles.searchInput}
          elevation={2}
        />
        
        <View style={styles.filterRow}>
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <TouchableOpacity 
                style={styles.filterButton}
                onPress={() => setMenuVisible(true)}
              >
                <View style={styles.filterButtonContent}>
                  <MaterialIcons name="filter-list" size={18} color="#4CAF50" />
                  <Text style={styles.filterButtonText}>
                    {selectedType === 'All' ? 'All Types' : selectedType}
                  </Text>
                  <MaterialIcons name="arrow-drop-down" size={18} color="#4CAF50" />
                </View>
              </TouchableOpacity>
            }
            contentStyle={styles.menuContent}
          >
            <Menu.Item
              onPress={() => handleTypeSelect('All')}
              title="All Types"
              titleStyle={styles.menuItemText}
            />
            {insightTypes.map(type => (
              <Menu.Item
                key={type.value}
                onPress={() => handleTypeSelect(type.value)}
                title={type.label}
                titleStyle={styles.menuItemText}
              />
            ))}
          </Menu>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipContainer}
          >
            <TouchableOpacity onPress={() => handleSeveritySelect('All')}>
              <Chip 
                style={[
                  styles.filterChip,
                  selectedSeverity === 'All' && styles.selectedFilterChip,
                ]}
                textStyle={styles.filterChipText}
              >
                All
              </Chip>
            </TouchableOpacity>
            {severityLevels.map(level => (
              <TouchableOpacity 
                key={level} 
                onPress={() => handleSeveritySelect(level)}
                style={styles.severityChipWrapper}
              >
                <Chip 
                  style={[
                    styles.filterChip,
                    selectedSeverity === level && styles.selectedFilterChip,
                  ]}
                  textStyle={styles.filterChipText}
                >
                  <Icon 
                    name={getSeverityIcon(level)} 
                    size={16} 
                    color="white" 
                    style={styles.severityIcon}
                  />
                  {level}
                </Chip>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
      
      {/* Generate New Insight Button */}
      <TouchableOpacity 
        onPress={() => setModalVisible(true)}
        style={styles.generateButton}
      >
        <MaterialIcons name="add" size={24} color="white" />
        <Text style={styles.generateButtonText}>Generate New Insight</Text>
      </TouchableOpacity>

      {/* Generate Insight Modal */}
      <Portal>
        <Modal 
          visible={modalVisible} 
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card style={styles.modalCard}>
            <Card.Title 
              title="Generate New Insight" 
              titleStyle={styles.modalTitle}
              left={(props) => <Avatar.Icon {...props} icon={() => <MaterialIcons name="lightbulb-on" size={24} color="#4CAF50" />} />}
            />
            <Card.Content>
              {/* Insight Type Selector */}
              <View style={styles.typeSelectorContainer}>
                <Text style={styles.typeSelectorLabel}>Insight Type:</Text>
                <Menu
                  visible={typeMenuVisible}
                  onDismiss={() => setTypeMenuVisible(false)}
                  anchor={
                    <TouchableOpacity
                      style={styles.typeSelectorButton}
                      onPress={() => setTypeMenuVisible(true)}
                    >
                      <View style={styles.typeSelectorButtonContent}>
                        <Icon 
                          name={insightTypes.find(t => t.value === newInsightData.type)?.icon || 'help'} 
                          size={20} 
                          color="#4CAF50" 
                        />
                        <Text style={styles.typeSelectorButtonText}>
                          {insightTypes.find(t => t.value === newInsightData.type)?.label || 'Select Type'}
                        </Text>
                        <MaterialIcons name="arrow-drop-down" size={20} color="#4CAF50" />
                      </View>
                    </TouchableOpacity>
                  }
                  contentStyle={styles.typeMenuContent}
                >
                  {insightTypes.map((type) => (
                    <Menu.Item
                      key={type.value}
                      onPress={() => {
                        setNewInsightData({...newInsightData, type: type.value});
                        setTypeMenuVisible(false);
                      }}
                      title={type.label}
                      titleStyle={styles.typeMenuItemText}
                    />
                  ))}
                </Menu>
              </View>

              <TextInput
                label="Start Date (YYYY-MM-DD)"
                value={newInsightData.startDate}
                onChangeText={text => setNewInsightData({...newInsightData, startDate: text})}
                style={styles.modalInput}
                mode="outlined"
                left={<TextInput.Icon icon={() => <MaterialIcons name="calendar-month" size={20} />} />}
              />
              <TextInput
                label="End Date (YYYY-MM-DD)"
                value={newInsightData.endDate}
                onChangeText={text => setNewInsightData({...newInsightData, endDate: text})}
                style={styles.modalInput}
                mode="outlined"
                left={<TextInput.Icon icon={() => <MaterialIcons name="calendar-month" size={20} />} />}
              />
              <TextInput
                label="Breed Filter (optional)"
                value={newInsightData.filters.breed}
                onChangeText={text => setNewInsightData({
                  ...newInsightData, 
                  filters: {...newInsightData.filters, breed: text}
                })}
                style={styles.modalInput}
                mode="outlined"
                left={<TextInput.Icon icon={() => <MaterialIcons name="pets" size={20} />} />}
              />
              <TextInput
                label="Status Filter (optional)"
                value={newInsightData.filters.status}
                onChangeText={text => setNewInsightData({
                  ...newInsightData, 
                  filters: {...newInsightData.filters, status: text}
                })}
                style={styles.modalInput}
                mode="outlined"
                left={<TextInput.Icon icon={() => <MaterialIcons name="check-circle" size={20} />} />}
              />

              <View style={styles.modalButtons}>
                <Button 
                  mode="outlined" 
                  onPress={() => setModalVisible(false)}
                  style={styles.modalButton}
                  labelStyle={styles.modalButtonText}
                >
                  Cancel
                </Button>
                <Button 
                  mode="contained" 
                  onPress={generateNewInsight}
                  style={[styles.modalButton, styles.generateModalButton]}
                  labelStyle={styles.modalButtonText}
                  loading={loading}
                  icon={() => <MaterialIcons name="lightning-bolt" size={20} color="white" />}
                >
                  Generate
                </Button>
              </View>
            </Card.Content>
          </Card>
        </Modal>
      </Portal>

      {/* Action Taken Modal */}
      <Portal>
        <Modal 
          visible={actionModalVisible} 
          onDismiss={() => setActionModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card style={styles.modalCard}>
            <Card.Title 
              title={`Mark Insight as Actioned`} 
              titleStyle={styles.modalTitle}
              left={(props) => <Avatar.Icon {...props} icon={() => <MaterialIcons name="check-circle" size={24} color="#4CAF50" />} />}
            />
            <Card.Content>
              <TextInput
                label="Action Taken *"
                value={actionTaken}
                onChangeText={setActionTaken}
                style={styles.modalInput}
                mode="outlined"
                multiline
                left={<TextInput.Icon icon={() => <MaterialIcons name="format-list-checks" size={20} />} />}
              />
              <TextInput
                label="Notes"
                value={actionNotes}
                onChangeText={setActionNotes}
                style={styles.modalInput}
                mode="outlined"
                multiline
                left={<TextInput.Icon icon={() => <MaterialIcons name="note-text" size={20} />} />}
              />

              <View style={styles.modalButtons}>
                <Button 
                  mode="outlined" 
                  onPress={() => setActionModalVisible(false)}
                  style={styles.modalButton}
                  labelStyle={styles.modalButtonText}
                >
                  Cancel
                </Button>
                <Button 
                  mode="contained" 
                  onPress={markInsightAsActioned}
                  style={[styles.modalButton, styles.actionModalButton]}
                  labelStyle={styles.modalButtonText}
                  loading={loading}
                  disabled={!actionTaken}
                  icon={() => <MaterialIcons name="check-bold" size={20} color="white" />}
                >
                  Submit Action
                </Button>
              </View>
            </Card.Content>
          </Card>
        </Modal>
      </Portal>

      {/* Delete Confirmation Dialog */}
      <Portal>
        <Dialog 
          visible={deleteDialogVisible} 
          onDismiss={() => setDeleteDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Confirm Deletion</Dialog.Title>
          <Dialog.Content>
            <View style={styles.dialogContent}>
              <MaterialIcons name="warning" size={40} color="#ff4444" style={styles.dialogIcon} />
              <Text style={styles.dialogText}>
                Are you sure you want to delete this insight? This action cannot be undone.
              </Text>
            </View>
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button 
              onPress={() => setDeleteDialogVisible(false)}
              style={styles.dialogButton}
              labelStyle={styles.dialogButtonText}
            >
              Cancel
            </Button>
            <Button 
              onPress={deleteInsight} 
              style={[styles.dialogButton, styles.deleteDialogButton]}
              labelStyle={styles.dialogButtonText}
              loading={loading}
              icon={() => <MaterialIcons name="delete" size={20} color="white" />}
            >
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Insights List */}
      <FlatList
        data={filteredInsights}
        renderItem={renderInsightItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#4CAF50']}
            tintColor="#4CAF50"
            title="Refreshing insights..."
            titleColor="#4CAF50"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="find-in-page" size={60} color="#e0e0e0" />
            <Text style={styles.emptyText}>No insights found matching your criteria</Text>
            <TouchableOpacity 
              onPress={handleRefresh}
              style={styles.refreshButton}
            >
              <MaterialIcons name="refresh" size={20} color="#4CAF50" />
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    paddingBottom: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#757575',
  },
  filterContainer: {
    padding: 16,
    paddingBottom: 8,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchBar: {
    borderRadius: 10,
    backgroundColor: 'white',
    marginBottom: 12,
    elevation: 2,
  },
  searchInput: {
    fontSize: 14,
    color: '#333',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
  },
  filterButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButtonText: {
    color: '#333',
    fontWeight: '500',
    fontSize: 14,
    marginHorizontal: 4,
  },
  menuContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 4,
  },
  menuItemText: {
    fontSize: 14,
    color: '#333',
  },
  chipContainer: {
    paddingVertical: 4,
  },
  filterChip: {
    marginRight: 8,
    backgroundColor: '#4CAF50',
  },
  selectedFilterChip: {
    borderWidth: 2,
    borderColor: '#ffffff',
    elevation: 2,
  },
  filterChipText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  severityChipWrapper: {
    marginRight: 8,
  },
  severityIcon: {
    marginRight: 4,
  },
  filterChipSmall: {
    marginRight: 6,
    marginBottom: 6,
    backgroundColor: '#e0e0e0',
    height: 32,
  },
  filterChipSmallText: {
    fontSize: 12,
    color: '#333',
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
    marginTop: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  refreshText: {
    color: '#4CAF50',
    fontWeight: '500',
    marginLeft: 4,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    elevation: 2,
  },
  generateButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
    backgroundColor: 'white',
    overflow: 'hidden',
  },
  expandedCard: {
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeAvatar: {
    backgroundColor: '#e8f5e9',
    marginRight: 12,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  dateText: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  severityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  severityChip: {
    height: 28,
    marginLeft: 8,
  },
  cardDivider: {
    marginVertical: 12,
    backgroundColor: '#e0e0e0',
    height: 1,
  },
  titleContainer: {
    marginBottom: 12,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 14,
    color: '#616161',
    marginBottom: 8,
    lineHeight: 20,
  },
  filtersContainer: {
    marginBottom: 12,
  },
  filterChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  dataContainer: {
    marginBottom: 12,
  },
  detailSection: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#424242',
    marginTop: 12,
    marginBottom: 6,
  },
  breedContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  breedTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: '#616161',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  detailText: {
    fontSize: 14,
    color: '#424242',
    marginBottom: 4,
    lineHeight: 20,
  },
  noDataText: {
    fontSize: 14,
    color: '#757575',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },
  listContainer: {
    marginTop: 8,
  },
  listItem: {
    fontSize: 13,
    color: '#616161',
    marginLeft: 8,
    marginBottom: 4,
    lineHeight: 18,
  },
  issueItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: 8,
    marginBottom: 6,
    paddingRight: 8,
  },
  issueText: {
    fontSize: 13,
    color: '#616161',
    flex: 1,
  },
  issueDetails: {
    flexDirection: 'row',
    width: 120,
    justifyContent: 'space-between',
  },
  issueCount: {
    fontSize: 13,
    color: '#616161',
  },
  issueCost: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#616161',
  },
  actionsContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  actionItem: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'flex-start',
  },
  actionIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  actionText: {
    fontSize: 14,
    color: '#424242',
    flex: 1,
    lineHeight: 20,
  },
  relatedEntitiesContainer: {
    marginTop: 12,
    marginBottom: 12,
  },
  entitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  entityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  entityIcon: {
    marginRight: 6,
  },
  entityType: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#424242',
  },
  entityId: {
    fontSize: 12,
    color: '#616161',
  },
  actionTakenContainer: {
    marginTop: 12,
    marginBottom: 12,
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    padding: 12,
  },
  actionTakenText: {
    fontSize: 14,
    color: '#2e7d32',
    marginBottom: 8,
    lineHeight: 20,
  },
  actionNotesText: {
    fontSize: 14,
    color: '#616161',
    marginBottom: 8,
    lineHeight: 20,
  },
  actionDateText: {
    fontSize: 12,
    color: '#757575',
    fontStyle: 'italic',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  metadataContainer: {
    flex: 1,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  footerButtons: {
    flexDirection: 'row',
    marginLeft: 12,
  },
  createdAtText: {
    fontSize: 12,
    color: '#757575',
    marginLeft: 4,
  },
  roleText: {
    fontSize: 12,
    color: '#757575',
    marginLeft: 4,
  },
  actionButton: {
    marginLeft: 8,
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    minWidth: 100,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  deleteButton: {
    marginLeft: 8,
    borderColor: '#d32f2f',
    borderRadius: 20,
    minWidth: 80,
  },
  deleteButtonText: {
    color: '#d32f2f',
    fontSize: 12,
    fontWeight: '500',
  },
  modalContainer: {
    padding: 20,
  },
  modalCard: {
    borderRadius: 12,
    elevation: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  typeSelectorContainer: {
    marginBottom: 16,
  },
  typeSelectorLabel: {
    fontSize: 14,
    color: '#616161',
    marginBottom: 8,
  },
  typeSelectorButton: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  typeSelectorButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  typeSelectorButtonText: {
    fontSize: 16,
    color: '#333',
    marginHorizontal: 8,
  },
  typeMenuContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 4,
  },
  typeMenuItemText: {
    fontSize: 16,
    color: '#333',
  },
  modalInput: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 8,
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  generateModalButton: {
    backgroundColor: '#4CAF50',
  },
  actionModalButton: {
    backgroundColor: '#4CAF50',
  },
  dialog: {
    borderRadius: 12,
    backgroundColor: 'white',
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  dialogContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  dialogIcon: {
    marginBottom: 16,
  },
  dialogText: {
    fontSize: 16,
    color: '#616161',
    textAlign: 'center',
    lineHeight: 24,
  },
  dialogActions: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  dialogButton: {
    flex: 1,
    marginHorizontal: 8,
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
  },
  dialogButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  deleteDialogButton: {
    backgroundColor: '#d32f2f',
  },
});

export default InsightTab;