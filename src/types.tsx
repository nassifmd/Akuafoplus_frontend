import { StackNavigationProp } from '@react-navigation/stack';

// Example type export to make this file a module
export type ExampleType = {};

export type RootStackParamList = {
  Profile: undefined;
  // Add other screens here
};

export type ProfileScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Profile'
>;