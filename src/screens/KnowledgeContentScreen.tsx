import React from "react";
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import LinearGradient from 'react-native-linear-gradient';
import Config from '../Config/config';

const { width } = Dimensions.get('window');

type TableData = {
  headers: string[];
  rows: any[][];
};

const categoryData = {
  crop: { name: 'Crop', icon: 'grass', color: '#2E7D32', gradient: ['#4CAF50', '#2E7D32'] },
  livestock: { name: 'Livestock', icon: 'pets', color: '#6D4C41', gradient: ['#8D6E63', '#6D4C41'] },
  poultry: { name: 'Poultry', icon: 'egg', color: '#F9A825', gradient: ['#FBC02D', '#F9A825'] },
  default: { name: 'General', icon: 'article', color: '#5D4037', gradient: ['#757575', '#5D4037'] }
};

const getCategoryInfo = (categoryKey: string) => {
  if (categoryKey && categoryData[categoryKey as keyof typeof categoryData]) {
    return categoryData[categoryKey as keyof typeof categoryData];
  }
  return categoryData.default;
};

// Helper to convert relative backend paths to absolute URLs
const apiOrigin = (Config.API_BASE_URL || '').replace(/\/+$/, '').replace(/\/api(?:\/)?$/, '');
const toAbsoluteUrl = (u?: string) => {
  if (!u) return u as undefined;
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('/')) return `${apiOrigin}${u}`;
  return `${apiOrigin}/${u}`;
};

const Table = ({ table }: { table: TableData }) => {
  if (!table.headers || !table.rows) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="error-outline" size={20} color="#D32F2F" />
        <Text style={styles.errorText}>No table data available</Text>
      </View>
    );
  }

  return (
    <View style={styles.tableContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tableScrollContent}
      >
        <View>
          <View style={styles.tableRow}>
            {table.headers.map((header, index) => (
              <LinearGradient
                key={`header-${index}`}
                colors={['#388E3C', '#2E7D32']}
                style={[
                  styles.tableHeaderCell,
                  index === 0 && styles.firstHeaderCell,
                  index === table.headers.length - 1 && styles.lastHeaderCell
                ]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                <Text style={styles.tableHeaderText}>{header}</Text>
              </LinearGradient>
            ))}
          </View>
          
          <ScrollView style={styles.tableBodyScroll}>
            {table.rows.map((row, rowIndex) => (
              <TouchableOpacity 
                key={`row-${rowIndex}`} 
                style={[
                  styles.tableRow,
                  rowIndex % 2 === 0 ? styles.evenRow : styles.oddRow,
                  rowIndex === table.rows.length - 1 && styles.lastRow
                ]}
                activeOpacity={0.9}
              >
                {row.map((cell, cellIndex) => (
                  <View 
                    key={`cell-${rowIndex}-${cellIndex}`} 
                    style={[
                      styles.tableCell,
                      cellIndex === 0 && styles.firstCell,
                      cellIndex === row.length - 1 && styles.lastCell
                    ]}
                  >
                    <Text style={styles.tableCellText}>{String(cell)}</Text>
                  </View>
                ))}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
};

const KnowledgeContentScreen = ({ route, navigation }: any) => {
  const { item } = route.params;
  const categoryInfo = getCategoryInfo(item.category);
  const [showImage, setShowImage] = React.useState(true);
  const imageUri = toAbsoluteUrl(item.image);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Modern header with back button and title */}
      <LinearGradient
        colors={['#FFFFFF', '#F5F5F5']}
        style={styles.header}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
      >
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <Icon name="arrow-back" size={24} color="#37474F" />
        </TouchableOpacity>
        <Text style={styles.headerText} numberOfLines={1} ellipsizeMode="tail">
          {item.title}
        </Text>
        <View style={styles.headerRightPlaceholder} />
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Category badge with gradient */}
        <LinearGradient
          colors={categoryInfo.gradient}
          style={styles.categoryBadge}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        >
          <Icon 
            name={categoryInfo.icon} 
            size={18} 
            color="white" 
            style={styles.categoryIcon} 
          />
          <Text style={styles.categoryBadgeText}>
            {categoryInfo.name}
          </Text>
        </LinearGradient>

        {/* Hero image with modern styling */}
        {imageUri && showImage && (
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: imageUri }}
              style={styles.image}
              resizeMode="cover"
              onError={() => setShowImage(false)}
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.1)']}
              style={styles.imageOverlay}
              start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
            />
          </View>
        )}
        
        {/* Content card with improved typography */}
        <View style={styles.contentCard}>
          <Text style={styles.title}>{item.title}</Text>
          <View style={styles.divider} />
          <Text style={styles.content}>
            {item.content}
          </Text>
        </View>
        
        {/* Tables section with modern styling */}
        {item.tables && item.tables.length > 0 && (
          <View style={styles.tablesContainer}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <Icon name="grid-on" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.sectionTitle}>Data Tables</Text>
            </View>
            {item.tables.map((table: TableData, index: number) => (
              <View key={`table-${index}`} style={styles.tableWrapper}>
                <Table table={table} />
              </View>
            ))}
          </View>
        )}
        
        {/* Tags with modern chips styling */}
        {item.tags?.length ? (
          <View style={styles.tagsContainer}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <Icon name="label" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.sectionTitle}>Related Tags</Text>
            </View>
            <View style={styles.tagsList}>
              {item.tags.map((tag: string) => (
                <LinearGradient
                  key={tag}
                  colors={['#F5F5F5', '#EEEEEE']}
                  style={styles.tagContainer}
                  start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                >
                  <Text style={styles.tag}>#{tag}</Text>
                </LinearGradient>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  backButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#EEEEEE',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#263238",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 12,
    maxWidth: width - 120,
  },
  headerRightPlaceholder: {
    width: 40,
  },
  container: {
    paddingBottom: 40,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 24,
    marginTop: 20,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryIcon: {
    marginRight: 8,
  },
  categoryBadgeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  imageContainer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    position: 'relative',
  },
  image: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    backgroundColor: "#EEEEEE",
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 24,
    right: 24,
    height: 60,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  contentCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 24,
    marginHorizontal: 24,
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F5F5F5',
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#263238",
    marginBottom: 16,
    lineHeight: 32,
  },
  divider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginBottom: 20,
  },
  content: {
    fontSize: 16,
    color: "#455A64",
    lineHeight: 26,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginHorizontal: 24,
  },
  sectionIconContainer: {
    backgroundColor: '#388E3C',
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#37474F",
  },
  tablesContainer: {
    marginTop: 24,
  },
  tableWrapper: {
    marginHorizontal: 24,
    marginBottom: 24,
  },
  tableContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: 'white',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableHeaderCell: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    minWidth: 140,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
  },
  firstHeaderCell: {
    borderTopLeftRadius: 11,
  },
  lastHeaderCell: {
    borderRightWidth: 0,
    borderTopRightRadius: 11,
  },
  tableHeaderText: {
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  tableCell: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    minWidth: 140,
    borderRightWidth: 1,
    borderRightColor: '#EEEEEE',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    justifyContent: 'center',
  },
  firstCell: {
    borderLeftWidth: 0,
  },
  lastCell: {
    borderRightWidth: 0,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  tableCellText: {
    textAlign: 'center',
    color: '#37474F',
    fontSize: 14,
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    margin: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorText: {
    color: '#D32F2F',
    marginLeft: 10,
    fontWeight: '500',
  },
  tableScrollContent: {
    minWidth: '100%',
  },
  tableBodyScroll: {
    maxHeight: 400,
  },
  evenRow: {
    backgroundColor: '#FFFFFF',
  },
  oddRow: {
    backgroundColor: '#F9F9F9',
  },
  tagsContainer: {
    marginTop: 24,
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
  },
  tagContainer: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  tag: {
    color: '#455A64',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default KnowledgeContentScreen;