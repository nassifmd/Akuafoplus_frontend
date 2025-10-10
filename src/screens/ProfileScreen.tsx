// src/screens/ProfileScreen.tsx
import React from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import { ProfileScreenNavigationProp } from "../types";

type Props = {
  navigation: ProfileScreenNavigationProp;
  route: { params: { userId: string } };
};

const ProfileScreen: React.FC<Props> = ({ navigation, route }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Profile Screen</Text>
      <Text>User ID: {route.params.userId}</Text>
      <Button title="Go Back" onPress={() => navigation.goBack()} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  text: { fontSize: 24, fontWeight: "bold" },
});

export default ProfileScreen;
