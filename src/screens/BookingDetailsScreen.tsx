import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  ScrollView, 
  TouchableOpacity,
  Linking,
  Alert
} from "react-native";
import axios from "axios";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Config from "../Config/config";

type RootStackParamList = {
  BookingDetails: { bookingId: string };
};

type BookingDetailsScreenRouteProp = RouteProp<RootStackParamList, "BookingDetails">;

interface User {
  name: string;
  email: string;
  phone?: string;
}

interface Expert {
  firstName: string;
  lastName: string;
  title?: string;
}

interface Booking {
  _id: string;
  user: User;
  expert: Expert;
  service: string;
  date: string;
  duration: number;
  amount: number;
  status: string;
  meetingLink?: string;
  notes?: string;
}

const BookingDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<BookingDetailsScreenRouteProp>();
  const { bookingId } = route.params;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        setLoading(true);
        const token = await AsyncStorage.getItem("accessToken");
        const res = await axios.get(
          `${Config.API_BASE_URL}/bookings/${bookingId}`,
          token
            ? { headers: { Authorization: `Bearer ${token}` } }
            : undefined
        );
        if (res.data && res.data.success) {
          setBooking(res.data.data);
          console.log("Booking data:", res.data.data); // <-- Add this line
          setError(null);
        } else {
          console.log("API response error:", res.data);
          setError("Failed to load booking details");
        }
      } catch (err: any) {
        console.log("API request error:", err?.response || err?.message || err);
        setError("Failed to load booking details");
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId]);

  const handleJoinMeeting = async () => {
    if (booking?.meetingLink) {
      const supported = await Linking.canOpenURL(booking.meetingLink);
      if (supported) {
        await Linking.openURL(booking.meetingLink);
      } else {
        Alert.alert("Error", "Cannot open the meeting link");
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
        return "#10B981";
      case "pending":
        return "#F59E0B";
      case "cancelled":
        return "#EF4444";
      case "completed":
        return "#6366F1";
      default:
        return "#6B7280";
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading booking details...</Text>
      </View>
    );
  }

  if (error || !booking) {
    return (
      <View style={styles.center}>
        <MaterialIcons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>{error || "Booking not found."}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.title}>Booking Details</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + "20" }]}>
          <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
            {booking.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <MaterialIcons name="calendar-today" size={20} color="#6366F1" />
          <Text style={styles.cardTitle}>Appointment Details</Text>
        </View>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Service</Text>
            <Text style={styles.detailValue}>{booking.service}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Duration</Text>
            <Text style={styles.detailValue}>{booking.duration} hour(s)</Text>
          </View>
        </View>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Date & Time</Text>
            <Text style={styles.detailValue}>{new Date(booking.date).toLocaleString()}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Amount</Text>
            <Text style={styles.amountValue}>GHS {booking.amount}</Text>
          </View>
        </View>
      </View>

      {booking.meetingLink && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="videocam" size={20} color="#6366F1" />
            <Text style={styles.cardTitle}>Meeting Information</Text>
          </View>
          <TouchableOpacity style={styles.meetingButton} onPress={handleJoinMeeting}>
            <MaterialIcons name="link" size={18} color="#fff" />
            <Text style={styles.meetingButtonText}>Join Meeting</Text>
          </TouchableOpacity>
        </View>
      )}

      {booking.notes && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="document-text" size={20} color="#6366F1" />
            <Text style={styles.cardTitle}>Additional Notes</Text>
          </View>
          <Text style={styles.notesText}>{booking.notes}</Text>
        </View>
      )}

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <MaterialIcons name="person" size={20} color="#6366F1" />
          <Text style={styles.cardTitle}>Client Information</Text>
        </View>
        <View style={styles.infoRow}>
          <MaterialIcons name="person" size={16} color="#6B7280" />
          <Text style={styles.infoText}>
            {booking.user.name}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <MaterialIcons name="mail" size={16} color="#6B7280" />
          <Text style={styles.infoText}>{booking.user.email}</Text>
        </View>
        {booking.user.phone && (
          <View style={styles.infoRow}>
            <MaterialIcons name="call" size={16} color="#6B7280" />
            <Text style={styles.infoText}>{booking.user.phone}</Text>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <MaterialIcons name="star" size={20} color="#6366F1" />
          <Text style={styles.cardTitle}>Expert Information</Text>
        </View>
        <View style={styles.infoRow}>
          <MaterialIcons name="person" size={16} color="#6B7280" />
          <Text style={styles.infoText}>
            {booking.expert.title ? `${booking.expert.title} ` : ""}
            {booking.expert.firstName} {booking.expert.lastName}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#F8FAFC",
    flexGrow: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748B",
    fontFamily: "Inter-Medium",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "500",
    marginTop: 12,
    fontFamily: "Inter-Medium",
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1E293B",
    fontFamily: "Inter-Bold",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Inter-SemiBold",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    marginLeft: 8,
    fontFamily: "Inter-SemiBold",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 4,
    fontFamily: "Inter-Regular",
  },
  detailValue: {
    fontSize: 16,
    color: "#1E293B",
    fontWeight: "500",
    fontFamily: "Inter-Medium",
  },
  amountValue: {
    fontSize: 16,
    color: "#10B981",
    fontWeight: "600",
    fontFamily: "Inter-SemiBold",
  },
  meetingButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6366F1",
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  meetingButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    marginLeft: 8,
    fontSize: 16,
    fontFamily: "Inter-SemiBold",
  },
  notesText: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
    fontFamily: "Inter-Regular",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: "#475569",
    marginLeft: 8,
    fontFamily: "Inter-Regular",
  },
});

export default BookingDetailsScreen;