import AsyncStorage from "@react-native-async-storage/async-storage";

export const getAccessToken = async () => {
  try {
    const token = await AsyncStorage.getItem("accessToken");
    return token;
  } catch (error) {
    console.error("Error getting access token:", error);
    return null;
  }
};
