import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, Dimensions, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from '../../Config/config';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type Ingredient = {
  _id: string;
  name: string;
  category: string;
  costPerKg: number;
  nutrients: { cp: number; me: number; ndf: number; ca: number; p: number };
};

type ItemInput = {
  ingredient: string;
  inclusionKg: string;
  costPerKgOverride?: string;
  description?: string;
};

type Totals = { totalKg: number; totalCost: number; cp: number; me: number; ndf: number; ca: number; p: number };

const speciesOptions = ['cattle', 'sheep', 'goat'] as const;
const stageOptions = ['growth', 'lactation', 'maintenance', 'dairy', 'fattening', 'breeding'] as const;

const { width } = Dimensions.get('window');

type SavedFormulation = {
  _id: string;
  name: string;
  species: typeof speciesOptions[number];
  stage: typeof stageOptions[number];
  isTemplate: boolean;
  items: { ingredient: string; inclusionKg: number; costPerKgOverride?: number | null }[];
  createdAt?: string;
  target?: { weightKg?: number | null };
};

type PerfectSample = {
  species: typeof speciesOptions[number];
  stage: typeof stageOptions[number];
  sample: Array<{
    ingredient: string;
    inclusionKg: number;
    description: string;
  }>;
  description: string;
  nutritionalTargets: any;
};

const FeedFormulationTab = () => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [filteredIngredients, setFilteredIngredients] = useState<Ingredient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'ingredients' | 'mix' | 'samples'>('ingredients');

  const [species, setSpecies] = useState<typeof speciesOptions[number]>('cattle');
  const [stage, setStage] = useState<typeof stageOptions[number]>('maintenance');
  const [weightKg, setWeightKg] = useState<string>('');

  const [items, setItems] = useState<ItemInput[]>([]);
  const [analysis, setAnalysis] = useState<{
    totals: Totals;
    requirements: any;
    advice: string[];
    detailed: any[];
  } | null>(null);

  const [templates, setTemplates] = useState<SavedFormulation[]>([]);
  const [formulations, setFormulations] = useState<SavedFormulation[]>([]);
  const [loadingSaves, setLoadingSaves] = useState(false);
  const [perfectSamples, setPerfectSamples] = useState<PerfectSample[]>([]);
  const [loadingSamples, setLoadingSamples] = useState(false);

  // Filter ingredients based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredIngredients(ingredients);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = ingredients.filter(ingredient => 
        ingredient.name.toLowerCase().includes(query) ||
        ingredient.category.toLowerCase().includes(query)
      );
      setFilteredIngredients(filtered);
    }
  }, [searchQuery, ingredients]);

  // Resolve token from multiple keys and strip any "Bearer " prefix
  const getAuthToken = async (): Promise<string | null> => {
    try {
      const directKeys = ['token', 'authToken', 'accessToken', 'jwt', 'userToken'];
      for (const k of directKeys) {
        const raw = await AsyncStorage.getItem(k);
        if (raw && raw !== 'null' && raw !== 'undefined') {
          const t = raw.replace(/^"|"$/g, '').trim();
          if (t) return t.replace(/^Bearer\s+/i, '');
        }
      }
      const userRaw = await AsyncStorage.getItem('user');
      if (userRaw) {
        try {
          const u = JSON.parse(userRaw);
          const t = u?.token || u?.accessToken || u?.jwt;
          if (t) return String(t).trim().replace(/^Bearer\s+/i, '');
        } catch {}
      }
      return null;
    } catch {
      return null;
    }
  };

  const fetchIngredients = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${Config.API_BASE_URL}/feed/ingredients?limit=1000`);
      if (!res.ok) throw new Error('Failed to load ingredients');
      const data = await res.json();
      const arr = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
      setIngredients(arr);
      setFilteredIngredients(arr);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load ingredients');
    } finally {
      setLoading(false);
    }
  };

  const fetchFormulations = async () => {
    setLoadingSaves(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        setTemplates([]);
        setFormulations([]);
        return;
      }
      const res = await fetch(`${Config.API_BASE_URL}/feed/formulations`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error(`Failed to load formulations (${res.status})`);
      const data = await res.json();
      const list: SavedFormulation[] = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
      setTemplates(list.filter(f => f.isTemplate));
      setFormulations(list.filter(f => !f.isTemplate));
    } catch (e: any) {
      console.warn('fetchFormulations error:', e?.message || e);
    } finally {
      setLoadingSaves(false);
    }
  };

  const fetchPerfectSamples = async () => {
    setLoadingSamples(true);
    try {
      const res = await fetch(`${Config.API_BASE_URL}/feed/perfect-samples`);
      if (!res.ok) throw new Error('Failed to load perfect feed samples');
      const data = await res.json();
      
      if (data.samples) {
        // Convert the samples object into an array for easier rendering
        const samplesArray: PerfectSample[] = [];
        Object.keys(data.samples).forEach(species => {
          Object.keys(data.samples[species]).forEach(stage => {
            samplesArray.push({
              species: species as typeof speciesOptions[number],
              stage: stage as typeof stageOptions[number],
              sample: data.samples[species][stage],
              description: `Perfect ${stage} feed for ${species}`,
              nutritionalTargets: getRequirements({ species, stage, weightKg: null })
            });
          });
        });
        setPerfectSamples(samplesArray);
      }
    } catch (e: any) {
      console.warn('fetchPerfectSamples error:', e?.message || e);
    } finally {
      setLoadingSamples(false);
    }
  };

  // Delete a saved formulation/template
  const deleteFormulationById = async (id: string) => {
    const token = await getAuthToken();
    if (!token) {
      Alert.alert('Login required', 'Please log in to manage formulations.');
      return;
    }
    Alert.alert('Delete', 'Are you sure you want to delete this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            setLoadingSaves(true);
            const res = await fetch(`${Config.API_BASE_URL}/feed/formulations/${id}`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
            });
            if (!res.ok) {
              const text = await res.text();
              throw new Error(text || `Delete failed (${res.status})`);
            }
            await fetchFormulations();
            Alert.alert('Deleted', 'Item removed.');
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Delete failed');
          } finally {
            setLoadingSaves(false);
          }
        }
      }
    ]);
  };

  useEffect(() => {
    fetchIngredients();
    fetchFormulations();
    fetchPerfectSamples();
  }, []);

  const addItem = (ingredient: Ingredient) => {
    if (items.find(i => i.ingredient === ingredient._id)) return;
    setItems(prev => [...prev, { ingredient: ingredient._id, inclusionKg: '0', costPerKgOverride: '' }]);
    setActiveTab('mix');
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.ingredient !== id));
  };

  const loadPerfectSample = async (sample: PerfectSample) => {
    setSpecies(sample.species);
    setStage(sample.stage);
    
    // Convert sample items to the format needed for the mix
    const sampleItems: ItemInput[] = await Promise.all(
      sample.sample.map(async (item) => {
        // Find the ingredient ID by name
        const ingredient = ingredients.find(ing => 
          ing.name.toLowerCase().includes(item.ingredient.toLowerCase())
        );
        
        return {
          ingredient: ingredient?._id || item.ingredient,
          inclusionKg: item.inclusionKg.toString(),
          costPerKgOverride: '',
          description: item.description
        };
      })
    );

    setItems(sampleItems.filter(item => item.ingredient));
    setActiveTab('mix');
    setAnalysis(null);
    
    Alert.alert('Sample Loaded', `Perfect ${sample.stage} feed for ${sample.species} loaded. Adjust quantities as needed.`);
  };

  const createFormulationFromSample = async (sample: PerfectSample) => {
    const token = await getAuthToken();
    if (!token) {
      Alert.alert('Login required', 'Please log in to save formulations.');
      return;
    }

    const name = `Perfect ${sample.stage} Feed - ${sample.species}`;

    const payload = {
      name,
      species: sample.species,
      stage: sample.stage,
      target: { weightKg: Number(weightKg || 0) || null },
      isTemplate: true,
      items: sample.sample.map(item => ({
        ingredient: item.ingredient, // This should be the ID, but we'll need to map names to IDs
        inclusionKg: item.inclusionKg,
      })),
      notes: `Perfect feed sample for ${sample.species} ${sample.stage}`,
    };

    setLoading(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      headers.Authorization = `Bearer ${token}`;
      headers['x-access-token'] = token;
      headers['x-auth-token'] = token;

      const res = await fetch(`${Config.API_BASE_URL}/feed/formulations/from-sample`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Save failed (${res.status})`);
      }
      Alert.alert('Saved', 'Perfect feed template saved successfully.');
      await fetchFormulations();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const analyze = async () => {
    const payload = {
      species,
      stage,
      weightKg: Number(weightKg || 0),
      items: items
        .map(i => ({
          ingredient: i.ingredient,
          inclusionKg: Number(i.inclusionKg || 0),
          costPerKgOverride: i.costPerKgOverride ? Number(i.costPerKgOverride) : null,
        }))
        .filter(i => i.inclusionKg > 0),
    };

    if (!payload.items.length) {
      Alert.alert('No items', 'Please add at least one ingredient with quantity.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${Config.API_BASE_URL}/feed/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Analyze failed');
      const data = await res.json();
      setAnalysis(data);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Analyze failed');
    } finally {
      setLoading(false);
    }
  };

  const saveFormulation = async (asTemplate = false) => {
    const token = await getAuthToken();
    if (!token) {
      Alert.alert('Login required', 'Please log in to save formulations.');
      return;
    }

    const name = `Feed Mix - ${species} ${stage} ${new Date().toLocaleDateString()}`;

    // Build items; allow zero quantities for templates
    let builtItems = items.map(i => ({
      ingredient: i.ingredient,
      inclusionKg: Number(i.inclusionKg || 0),
      costPerKgOverride: i.costPerKgOverride ? Number(i.costPerKgOverride) : null,
    }));
    if (!asTemplate) {
      builtItems = builtItems.filter(i => i.inclusionKg > 0);
    }

    if (!builtItems.length) {
      Alert.alert('No items', asTemplate
        ? 'Add at least one ingredient to save a template.'
        : 'Please add at least one ingredient with quantity.');
      return;
    }

    const payload = {
      name,
      species,
      stage,
      target: { weightKg: Number(weightKg || 0) || null },
      isTemplate: asTemplate,
      items: builtItems,
      notes: '',
    };

    setLoading(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      // Send token in multiple commonly-used headers for compatibility
      headers.Authorization = `Bearer ${token}`;
      headers['x-access-token'] = token;
      headers['x-auth-token'] = token;

      const res = await fetch(`${Config.API_BASE_URL}/feed/formulations`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Save failed (${res.status})`);
      }
      Alert.alert('Saved', asTemplate ? 'Template saved.' : 'Formulation saved.');
      await fetchFormulations(); // refresh lists after save
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const selectedIngredients = useMemo(
    () => items.map(i => ingredients.find(g => g._id === i.ingredient)).filter(Boolean) as Ingredient[],
    [items, ingredients]
  );

  const NutrientBar = ({ value, min, max, label }: { value: number; min: number; max: number; label: string }) => {
    const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
    const isInRange = value >= min && value <= max;
    
    return (
      <View style={styles.nutrientBarContainer}>
        <View style={styles.nutrientHeader}>
          <Text style={styles.nutrientLabel}>{label}</Text>
          <Text style={styles.nutrientValue}>{value.toFixed(1)}%</Text>
        </View>
        <View style={styles.barBackground}>
          <View 
            style={[
              styles.barFill, 
              { width: `${percentage}%`, backgroundColor: isInRange ? '#4CAF50' : '#F44336' }
            ]} 
          />
        </View>
        <Text style={styles.rangeText}>
          Target: {min}-{max}%
        </Text>
      </View>
    );
  };

  const totalCost = useMemo(() => {
    return items.reduce((sum, item) => {
      const ing = ingredients.find(i => i._id === item.ingredient);
      const cost = item.costPerKgOverride ? parseFloat(item.costPerKgOverride) : (ing?.costPerKg || 0);
      const quantity = parseFloat(item.inclusionKg) || 0;
      return sum + (cost * quantity);
    }, 0);
  }, [items, ingredients]);

  const totalWeight = useMemo(() => {
    return items.reduce((sum, item) => {
      return sum + (parseFloat(item.inclusionKg) || 0);
    }, 0);
  }, [items]);

  function loadFromFormulation(t: SavedFormulation): void {
    setSpecies(t.species);
    setStage(t.stage);
    setWeightKg(
      t?.target?.weightKg !== undefined && t?.target?.weightKg !== null
        ? String(t.target.weightKg)
        : ''
    );
    setItems(
      Array.isArray(t.items)
        ? t.items.map(item => ({
            ingredient: item.ingredient,
            inclusionKg: item.inclusionKg !== undefined && item.inclusionKg !== null
              ? String(item.inclusionKg)
              : '0',
            costPerKgOverride: item.costPerKgOverride !== undefined && item.costPerKgOverride !== null
              ? String(item.costPerKgOverride)
              : '',
          }))
        : []
    );
    setActiveTab('mix');
    setAnalysis(null);
  }

  // Helper function to get requirements (mimics backend logic)
  const getRequirements = ({ species, stage, weightKg }: { species: string; stage: string; weightKg: number | null }) => {
    const ranges = {
      cattle: {
        fattening: { cp: [12, 14], me: [10.5, 11.5], ndf: [25, 35], ca: [0.5, 0.8], p: [0.35, 0.5] },
        dairy: { cp: [16, 18], me: [11, 12], ndf: [28, 34], ca: [0.8, 1.0], p: [0.45, 0.6] },
        breeding: { cp: [11, 13], me: [9.5, 11], ndf: [30, 38], ca: [0.5, 0.8], p: [0.35, 0.55] },
      },
      sheep: {
        fattening: { cp: [12, 14], me: [10, 11], ndf: [28, 35], ca: [0.5, 0.8], p: [0.35, 0.5] },
        dairy: { cp: [15, 18], me: [10, 12], ndf: [28, 34], ca: [0.7, 1.0], p: [0.4, 0.6] },
        breeding: { cp: [11, 13], me: [9.5, 11], ndf: [30, 38], ca: [0.5, 0.8], p: [0.35, 0.55] },
      },
      goat: {
        fattening: { cp: [12, 14], me: [10, 11], ndf: [28, 35], ca: [0.5, 0.8], p: [0.35, 0.5] },
        dairy: { cp: [15, 18], me: [10.5, 12], ndf: [28, 34], ca: [0.7, 1.0], p: [0.4, 0.6] },
        breeding: { cp: [11, 13], me: [9.5, 11], ndf: [30, 38], ca: [0.5, 0.8], p: [0.35, 0.55] },
      },
    };
    
    const sp = (ranges[species as keyof typeof ranges] || ranges.cattle)[stage as keyof typeof ranges.cattle] || ranges.cattle.fattening;
    return {
      cp: { min: sp.cp[0], max: sp.cp[1] },
      me: { min: sp.me[0], max: sp.me[1] },
      ndf: { min: sp.ndf[0], max: sp.ndf[1] },
      ca: { min: sp.ca[0], max: sp.ca[1] },
      p: { min: sp.p[0], max: sp.p[1] },
    };
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Feed Formulation</Text>
        <Text style={styles.subtitle}>Create balanced livestock feed recipes</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Animal Details Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="pets" size={20} color="#2e7d32" />
            <Text style={styles.cardTitle}>Animal Details</Text>
          </View>

          <Text style={styles.label}>Species</Text>
          <View style={styles.chipContainer}>
            {speciesOptions.map(s => (
              <TouchableOpacity
                key={s}
                onPress={() => setSpecies(s)}
                style={[styles.chip, species === s && styles.chipActive]}
              >
                <Text style={[styles.chipText, species === s && styles.chipTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Production Stage</Text>
          <View style={styles.chipContainer}>
            {stageOptions.map(s => (
              <TouchableOpacity
                key={s}
                onPress={() => setStage(s)}
                style={[styles.chip, stage === s && styles.chipActive]}
              >
                <Text style={[styles.chipText, stage === s && styles.chipTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Animal Weight (kg)</Text>
          <TextInput
            keyboardType="numeric"
            value={weightKg}
            onChangeText={setWeightKg}
            placeholder="e.g., 350"
            style={styles.input}
            placeholderTextColor="#9e9e9e"
          />
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'ingredients' && styles.tabActive]}
            onPress={() => setActiveTab('ingredients')}
          >
            <Text style={[styles.tabText, activeTab === 'ingredients' && styles.tabTextActive]}>
              Ingredients ({ingredients.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'mix' && styles.tabActive]}
            onPress={() => setActiveTab('mix')}
          >
            <Text style={[styles.tabText, activeTab === 'mix' && styles.tabTextActive]}>
              Feed Mix ({items.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'samples' && styles.tabActive]}
            onPress={() => setActiveTab('samples')}
          >
            <Text style={[styles.tabText, activeTab === 'samples' && styles.tabTextActive]}>
              Perfect Samples
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'ingredients' ? (
          /* Ingredients Grid with Search */
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="list" size={20} color="#2e7d32" />
              <Text style={styles.cardTitle}>Available Ingredients</Text>
            </View>
            
            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <MaterialIcons name="search" size={20} color="#9e9e9e" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search ingredients by name or category..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#9e9e9e"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchButton}>
                  <MaterialIcons name="close" size={18} color="#9e9e9e" />
                </TouchableOpacity>
              )}
            </View>
            
            {loading ? (
              <ActivityIndicator style={styles.loader} color="#2e7d32" />
            ) : (
              <FlatList
                data={filteredIngredients}
                keyExtractor={(i) => i._id}
                numColumns={2}
                columnWrapperStyle={styles.ingredientGrid}
                scrollEnabled={false}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <MaterialIcons name="search-off" size={40} color="#e0e0e0" />
                    <Text style={styles.emptyText}>No ingredients found</Text>
                    <Text style={styles.emptySubtext}>Try a different search term</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity onPress={() => addItem(item)} style={styles.ingredientCard}>
                    <Text style={styles.ingName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.ingCategory}>{item.category}</Text>
                    <View style={styles.nutrientRow}>
                      <View style={[styles.nutrientPill, { backgroundColor: '#E8F5E9' }]}>
                        <Text style={styles.nutrientPillText}>CP: {item.nutrients.cp}%</Text>
                      </View>
                      <View style={[styles.nutrientPill, { backgroundColor: '#E3F2FD' }]}>
                        <Text style={styles.nutrientPillText}>ME: {item.nutrients.me}</Text>
                      </View>
                    </View>
                    <Text style={styles.costText}>GH₵{item.costPerKg.toFixed(2)}/kg</Text>
                    <View style={styles.addButton}>
                      <MaterialIcons name="add" size={16} color="white" />
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        ) : activeTab === 'mix' ? (
          /* Feed Mix Composition */
          <View style={styles.card}>
            <View style={[styles.cardHeader, styles.spaceBetween]}>
              <View style={styles.cardHeader}>
                <MaterialIcons name="blender" size={20} color="#2e7d32" />
                <Text style={styles.cardTitle}>Feed Mix Composition</Text>
              </View>
              {items.length > 0 && (
                <TouchableOpacity onPress={() => setItems([])} style={styles.clearButton}>
                  <MaterialIcons name="delete-sweep" size={16} color="#e53935" />
                  <Text style={styles.clearButtonText}>Clear All</Text>
                </TouchableOpacity>
              )}
            </View>

            {items.length === 0 ? (
              <View style={styles.emptyMix}>
                <MaterialIcons name="info" size={24} color="#9e9e9e" />
                <Text style={styles.emptyMixText}>No ingredients added yet</Text>
                <Text style={styles.emptyMixSubtext}>Select ingredients from the Ingredients tab or load a perfect sample</Text>
              </View>
            ) : (
              <>
                {items.map((it, idx) => {
                  const ing = selectedIngredients[idx];
                  return (
                    <View key={it.ingredient} style={styles.mixRow}>
                      <View style={styles.mixInfo}>
                        <Text style={styles.mixName}>{ing?.name || 'Ingredient'}</Text>
                        {it.description && (
                          <Text style={styles.sampleDescription}>{it.description}</Text>
                        )}
                        <View style={styles.nutrientRow}>
                          <Text style={styles.mixSub}>CP: {ing?.nutrients.cp ?? 0}%</Text>
                          <Text style={styles.mixSub}>ME: {ing?.nutrients.me ?? 0}</Text>
                          <Text style={styles.mixSub}>GH₵{ing?.costPerKg.toFixed(2) ?? 0}/kg</Text>
                        </View>
                      </View>

                      <View style={styles.inputGroup}>
                        <View style={styles.inputWithLabel}>
                          <Text style={styles.inputLabel}>Kg</Text>
                          <TextInput
                            keyboardType="numeric"
                            placeholder="0"
                            value={it.inclusionKg}
                            onChangeText={(v) => {
                              const arr = [...items];
                              arr[idx] = { ...arr[idx], inclusionKg: v };
                              setItems(arr);
                            }}
                            style={styles.inputSmall}
                          />
                        </View>

                        <View style={styles.inputWithLabel}>
                          <Text style={styles.inputLabel}>GH₵/kg</Text>
                          <TextInput
                            keyboardType="numeric"
                            placeholder={`${ing?.costPerKg ?? 0}`}
                            value={it.costPerKgOverride}
                            onChangeText={(v) => {
                              const arr = [...items];
                              arr[idx] = { ...arr[idx], costPerKgOverride: v };
                              setItems(arr);
                            }}
                            style={styles.inputSmall}
                          />
                        </View>
                      </View>

                      <TouchableOpacity onPress={() => removeItem(it.ingredient)} style={styles.removeBtn}>
                        <MaterialIcons name="close" size={16} color="white" />
                      </TouchableOpacity>
                    </View>
                  );
                })}

                {/* Totals Summary */}
                <View style={styles.totalsContainer}>
                  <View style={styles.totalItem}>
                    <Text style={styles.totalLabel}>Total Weight</Text>
                    <Text style={styles.totalValue}>{totalWeight.toFixed(1)} kg</Text>
                  </View>
                  <View style={styles.totalItem}>
                    <Text style={styles.totalLabel}>Total Cost</Text>
                    <Text style={styles.totalValue}>GH₵{totalCost.toFixed(2)}</Text>
                  </View>
                  <View style={styles.totalItem}>
                    <Text style={styles.totalLabel}>Cost/kg</Text>
                    <Text style={styles.totalValue}>
                      GH₵{(totalWeight > 0 ? totalCost / totalWeight : 0).toFixed(2)}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
        ) : (
          /* Perfect Feed Samples */
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="star" size={20} color="#FFA000" />
              <Text style={styles.cardTitle}>Perfect Feed Samples</Text>
            </View>
            
            <Text style={styles.sampleIntro}>
              Pre-optimized feed formulations for different species and production stages. 
              These samples provide balanced nutrition based on best practices.
            </Text>

            {loadingSamples ? (
              <ActivityIndicator style={styles.loader} color="#2e7d32" />
            ) : perfectSamples.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="star-outline" size={40} color="#e0e0e0" />
                <Text style={styles.emptyText}>No perfect samples available</Text>
                <Text style={styles.emptySubtext}>Check your connection and try again</Text>
              </View>
            ) : (
              <View style={styles.samplesContainer}>
                {perfectSamples.map((sample, index) => (
                  <View key={index} style={styles.sampleCard}>
                    <View style={styles.sampleHeader}>
                      <View>
                        <Text style={styles.sampleTitle}>
                          {sample.species.charAt(0).toUpperCase() + sample.species.slice(1)} - {sample.stage}
                        </Text>
                        <Text style={styles.sampleSubtitle}>
                          {sample.sample.length} ingredients • Optimized formulation
                        </Text>
                      </View>
                      <View style={styles.speciesBadge}>
                        <Text style={styles.speciesBadgeText}>
                          {sample.species.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.sampleIngredients}>
                      <Text style={styles.ingredientsLabel}>Ingredients:</Text>
                      {sample.sample.slice(0, 3).map((item, idx) => (
                        <Text key={idx} style={styles.ingredientItem}>
                          • {item.ingredient}: {item.inclusionKg}kg
                        </Text>
                      ))}
                      {sample.sample.length > 3 && (
                        <Text style={styles.moreIngredients}>
                          +{sample.sample.length - 3} more ingredients
                        </Text>
                      )}
                    </View>

                    <View style={styles.sampleActions}>
                      <TouchableOpacity 
                        style={[styles.sampleButton, styles.loadButton]}
                        onPress={() => loadPerfectSample(sample)}
                      >
                        <MaterialIcons name="file-download" size={16} color="white" />
                        <Text style={styles.sampleButtonText}>Load Sample</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={[styles.sampleButton, styles.saveButton]}
                        onPress={() => createFormulationFromSample(sample)}
                      >
                        <MaterialIcons name="save" size={16} color="white" />
                        <Text style={styles.sampleButtonText}>Save as Template</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Action Buttons - Only show for mix tab */}
        {activeTab === 'mix' && items.length > 0 && (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              onPress={analyze}
              style={[styles.button, styles.primaryButton]}
              disabled={loading}
            >
              <MaterialIcons name="analytics" size={18} color="white" />
              <Text style={styles.buttonText}>Analyze Formula</Text>
            </TouchableOpacity>

            <View style={styles.buttonGroup}>
              <TouchableOpacity
                onPress={() => saveFormulation(false)}
                style={[styles.button, styles.secondaryButton]}
                disabled={loading}
              >
                <MaterialIcons name="save" size={18} color="white" />
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => saveFormulation(true)}
                style={[styles.button, styles.outlineButton]}
                disabled={loading}
              >
                <MaterialIcons name="content-copy" size={18} color="#2e7d32" />
                <Text style={[styles.buttonText, styles.outlineButtonText]}>Save Template</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Analysis Results */}
        {analysis && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="assessment" size={20} color="#2e7d32" />
              <Text style={styles.cardTitle}>Nutrient Analysis</Text>
            </View>

            <View style={styles.nutrientAnalysis}>
              <NutrientBar value={analysis.totals.cp} min={analysis.requirements.cp.min} max={analysis.requirements.cp.max} label="Crude Protein" />
              <NutrientBar value={analysis.totals.me} min={analysis.requirements.me.min} max={analysis.requirements.me.max} label="Metab Energy" />
              <NutrientBar value={analysis.totals.ndf} min={analysis.requirements.ndf.min} max={analysis.requirements.ndf.max} label="NDF" />
              <NutrientBar value={analysis.totals.ca} min={analysis.requirements.ca.min} max={analysis.requirements.ca.max} label="Calcium" />
              <NutrientBar value={analysis.totals.p} min={analysis.requirements.p.min} max={analysis.requirements.p.max} label="Phosphorus" />
            </View>

            <View style={styles.adviceContainer}>
              <View style={styles.cardHeader}>
                <MaterialIcons name="lightbulb" size={20} color="#FFA000" />
                <Text style={styles.adviceTitle}>Recommendations</Text>
              </View>
              {analysis.advice.length ? (
                analysis.advice.map((a, i) => (
                  <View key={i} style={styles.adviceItem}>
                    <MaterialIcons name="chevron-right" size={16} color="#FFA000" />
                    <Text style={styles.adviceText}>{a}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.adviceItem}>
                  <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                  <Text style={styles.adviceText}>Formulation meets all nutritional requirements</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {activeTab === 'mix' && (
          <>
            <View style={styles.card}>
              <View style={[styles.cardHeader, styles.spaceBetween]}>
                <View style={styles.cardHeader}>
                  <MaterialIcons name="bookmark" size={20} color="#2e7d32" />
                  <Text style={styles.cardTitle}>My Templates</Text>
                </View>
                <TouchableOpacity onPress={fetchFormulations} style={styles.clearButton}>
                  <MaterialIcons name="refresh" size={16} color="#2e7d32" />
                  <Text style={[styles.clearButtonText, { color: '#2e7d32' }]}>Refresh</Text>
                </TouchableOpacity>
              </View>
              {loadingSaves ? (
                <ActivityIndicator style={styles.loader} color="#2e7d32" />
              ) : templates.length === 0 ? (
                <Text style={styles.emptyText}>No templates saved yet</Text>
              ) : (
                templates.slice(0, 5).map(t => (
                  <View key={t._id} style={styles.mixRow}>
                    <TouchableOpacity style={styles.mixInfo} onPress={() => loadFromFormulation(t)}>
                      <Text style={styles.mixName}>{t.name}</Text>
                      <Text style={styles.mixSub}>{t.species} • {t.stage} • {t.items?.length || 0} items</Text>
                    </TouchableOpacity>
                    <View style={styles.rowActions}>
                      <TouchableOpacity onPress={() => loadFromFormulation(t)} style={[styles.iconBtn, styles.iconBtnPrimary]}>
                        <MaterialIcons name="file-download" size={16} color="white" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteFormulationById(t._id)} style={[styles.iconBtn, styles.iconBtnDanger]}>
                        <MaterialIcons name="delete" size={16} color="white" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>

            <View style={styles.card}>
              <View style={[styles.cardHeader, styles.spaceBetween]}>
                <View style={styles.cardHeader}>
                  <MaterialIcons name="save" size={20} color="#2e7d32" />
                  <Text style={styles.cardTitle}>My Saved Formulations</Text>
                </View>
                <TouchableOpacity onPress={fetchFormulations} style={styles.clearButton}>
                  <MaterialIcons name="refresh" size={16} color="#2e7d32" />
                  <Text style={[styles.clearButtonText, { color: '#2e7d32' }]}>Refresh</Text>
                </TouchableOpacity>
              </View>
              {loadingSaves ? (
                <ActivityIndicator style={styles.loader} color="#2e7d32" />
              ) : formulations.length === 0 ? (
                <Text style={styles.emptyText}>No saved formulations</Text>
              ) : (
                formulations.slice(0, 5).map(f => (
                  <View key={f._id} style={styles.mixRow}>
                    <TouchableOpacity style={styles.mixInfo} onPress={() => loadFromFormulation(f)}>
                      <Text style={styles.mixName}>{f.name}</Text>
                      <Text style={styles.mixSub}>{f.species} • {f.stage} • {f.items?.length || 0} items</Text>
                    </TouchableOpacity>
                    <View style={styles.rowActions}>
                      <TouchableOpacity onPress={() => loadFromFormulation(f)} style={[styles.iconBtn, styles.iconBtnPrimary]}>
                        <MaterialIcons name="file-download" size={16} color="white" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteFormulationById(f._id)} style={[styles.iconBtn, styles.iconBtnDanger]}>
                        <MaterialIcons name="delete" size={16} color="white" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8faf9'
  },
  header: {
    padding: 16,
    paddingBottom: 8,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2c3e50'
  },
  subtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 4
  },
  scrollView: {
    flex: 1
  },
  content: {
    padding: 16
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  spaceBetween: {
    justifyContent: 'space-between'
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
    color: '#2c3e50'
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#34495e'
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#f8f9fa'
  },
  chipActive: {
    backgroundColor: '#2e7d32',
    borderColor: '#2e7d32'
  },
  chipText: {
    color: '#7f8c8d',
    fontSize: 14
  },
  chipTextActive: {
    color: 'white'
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#f8f9fa'
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 4
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6
  },
  tabActive: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  tabText: {
    fontWeight: '500',
    color: '#7f8c8d',
    fontSize: 12
  },
  tabTextActive: {
    color: '#2e7d32',
    fontWeight: '600'
  },
  // Search styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    backgroundColor: '#f8f9fa'
  },
  searchIcon: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: '#2c3e50'
  },
  clearSearchButton: {
    padding: 4
  },
  // Ingredient styles
  ingredientGrid: {
    justifyContent: 'space-between'
  },
  ingredientCard: {
    width: '48%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e8f5e9',
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#f8faf9',
    position: 'relative'
  },
  ingName: {
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 4,
    color: '#2c3e50'
  },
  ingCategory: {
    fontSize: 11,
    color: '#7f8c8d',
    marginBottom: 8,
    fontStyle: 'italic'
  },
  nutrientRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8
  },
  nutrientPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  nutrientPillText: {
    fontSize: 10,
    fontWeight: '500'
  },
  costText: {
    fontWeight: '600',
    color: '#e65100',
    fontSize: 12
  },
  addButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#2e7d32',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 20
  },
  emptyText: {
    textAlign: 'center',
    color: '#9e9e9e',
    padding: 8,
    fontWeight: '500'
  },
  emptySubtext: {
    textAlign: 'center',
    color: '#bdc3c7',
    fontSize: 12
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  clearButtonText: {
    color: '#e53935',
    fontWeight: '500',
    marginLeft: 4
  },
  emptyMix: {
    alignItems: 'center',
    padding: 20
  },
  emptyMixText: {
    color: '#7f8c8d',
    fontWeight: '500',
    marginTop: 8
  },
  emptyMixSubtext: {
    color: '#bdc3c7',
    fontSize: 12,
    marginTop: 4
  },
  mixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e8f5e9',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f8faf9'
  },
  mixInfo: {
    flex: 1,
    marginRight: 12
  },
  mixName: {
    fontWeight: '600',
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 4
  },
  mixSub: {
    color: '#7f8c8d',
    fontSize: 10,
    marginRight: 8
  },
  sampleDescription: {
    color: '#FFA000',
    fontSize: 10,
    fontStyle: 'italic',
    marginBottom: 4
  },
  inputGroup: {
    flexDirection: 'row',
    marginRight: 12
  },
  inputWithLabel: {
    marginHorizontal: 4
  },
  inputLabel: {
    fontSize: 10,
    color: '#7f8c8d',
    marginBottom: 2,
    textAlign: 'center'
  },
  inputSmall: {
    width: 60,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    textAlign: 'center',
    backgroundColor: 'white',
    fontSize: 12
  },
  removeBtn: {
    backgroundColor: '#e53935',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center'
  },
  totalsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0'
  },
  totalItem: {
    alignItems: 'center'
  },
  totalLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50'
  },
  buttonRow: {
    marginBottom: 16
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8
  },
  primaryButton: {
    backgroundColor: '#2e7d32'
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#1976d2'
  },
  outlineButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2e7d32'
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 6
  },
  outlineButtonText: {
    color: '#2e7d32'
  },
  loader: {
    marginVertical: 20
  },
  nutrientAnalysis: {
    marginBottom: 16
  },
  nutrientBarContainer: {
    marginBottom: 16
  },
  nutrientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  nutrientLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#34495e'
  },
  nutrientValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2c3e50'
  },
  barBackground: {
    height: 6,
    backgroundColor: '#ecf0f1',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4
  },
  barFill: {
    height: '100%',
    borderRadius: 3
  },
  rangeText: {
    fontSize: 10,
    color: '#7f8c8d'
  },
  adviceContainer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0'
  },
  adviceTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    color: '#2c3e50'
  },
  adviceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8
  },
  adviceText: {
    flex: 1,
    marginLeft: 8,
    color: '#34495e',
    fontSize: 14
  },
  rowActions: {
    flexDirection: 'row',
    gap: 8
  },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconBtnPrimary: {
    backgroundColor: '#2e7d32'
  },
  iconBtnDanger: {
    backgroundColor: '#e53935'
  },
  // Perfect Samples Styles
  sampleIntro: {
    color: '#7f8c8d',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    textAlign: 'center'
  },
  samplesContainer: {
    gap: 12
  },
  sampleCard: {
    borderWidth: 1,
    borderColor: '#FFE082',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFDE7'
  },
  sampleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  sampleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50'
  },
  sampleSubtitle: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 2
  },
  speciesBadge: {
    backgroundColor: '#2e7d32',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  speciesBadgeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12
  },
  sampleIngredients: {
    marginBottom: 12
  },
  ingredientsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#34495e',
    marginBottom: 4
  },
  ingredientItem: {
    fontSize: 11,
    color: '#7f8c8d',
    marginLeft: 8
  },
  moreIngredients: {
    fontSize: 10,
    color: '#bdc3c7',
    fontStyle: 'italic',
    marginLeft: 8,
    marginTop: 2
  },
  sampleActions: {
    flexDirection: 'row',
    gap: 8
  },
  sampleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 4
  },
  loadButton: {
    backgroundColor: '#2e7d32'
  },
  saveButton: {
    backgroundColor: '#1976d2'
  },
  sampleButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500'
  }
});

export default FeedFormulationTab;