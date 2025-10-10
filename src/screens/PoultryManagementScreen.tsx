import React from "react";
import { View, Text, StyleSheet } from "react-native";

const PoultryManagementScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>We are lunching soon</Text>
      <Text style={styles.text}>Stay tuned for updates!</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 20,
    fontWeight: "bold",
  },
});

export default PoultryManagementScreen;
