import React from "react";
import { View, Text, Image, StyleSheet, ImageBackground, Dimensions, StatusBar, TouchableOpacity } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Onboarding from "react-native-onboarding-swiper";

const { width, height } = Dimensions.get('window');
//const logo = require("../assets/logo1.png");
const backgroundImage1 = require("../assets/cartoon/bg1.jpg");
const backgroundImage2 = require("../assets/cartoon/bg2.jpg"); 
const backgroundImage3 = require("../assets/cartoon/bg3.jpg");
const backgroundImage4 = require("../assets/cartoon/bg4.jpg");
const backgroundImage5 = require("../assets/cartoon/bg5.jpg");
const backgroundImage6 = require("../assets/cartoon/bg6.jpg");

const OnboardingScreen = ({ navigation }: any) => {
  const handleDone = async () => {
    await AsyncStorage.setItem("hasSeenOnboarding", "true");
    navigation.replace("LoginScreen");
  };

  const DotComponent = ({ selected }: { selected: boolean }) => {
    return (
      <View
        style={[
          styles.dot,
          selected ? styles.dotActive : styles.dotInactive
        ]}
      />
    );
  };

  const NextButton = ({ ...props }) => (
    <TouchableOpacity
      style={styles.buttonContainer}
      onPress={props.onPress}
    >
      <Text style={styles.buttonText}>
        {props.isLast ? "Get Started" : "Next"}
      </Text>
    </TouchableOpacity>
  );

  const SkipButton = ({ ...props }) => (
    <TouchableOpacity
      style={styles.skipButtonContainer}
      onPress={props.onPress}
    >
      <Text style={styles.skipButtonText}>Skip</Text>
    </TouchableOpacity>
  );

  const DoneButton = ({ ...props }) => (
    <TouchableOpacity
      style={styles.buttonContainer}
      onPress={handleDone}
    >
      <Text style={styles.buttonText}>Get Started</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <Onboarding
        onDone={handleDone}
        onSkip={handleDone}
        containerStyles={styles.onboardingContainer}
        bottomBarHighlight={false}
        DotComponent={DotComponent}
        NextButtonComponent={NextButton}
        SkipButtonComponent={SkipButton}
        DoneButtonComponent={DoneButton}
        titleStyles={styles.title}
        subTitleStyles={styles.subtitle}
        pages={[
          {
            backgroundColor: "transparent",
            image: (
              <View style={styles.fullScreenContainer}>
                <ImageBackground 
                  source={backgroundImage1} 
                  style={styles.fullScreenBackground}
                  resizeMode="cover"
                >
                  <View style={styles.overlay} />
                  <View style={styles.contentContainer}>
                    <View style={styles.logoContainer}>
                      {/* <Image
                        source={logo}
                        style={styles.logo}
                      /> */}
                    </View>
                    <View style={styles.textContainer}>
                      <Text style={styles.heading}>
                        Smart Farming Solutions
                      </Text>
                      <Text style={styles.description}>
                        All-in-one guide and tool for smarter crop and livestock farming
                      </Text>
                    </View>
                  </View>
                </ImageBackground>
              </View>
            ),
            title: "",
            subtitle: "",
          },
          {
            backgroundColor: "transparent",
            image: (
              <View style={styles.fullScreenContainer}>
                <ImageBackground 
                  source={backgroundImage2} 
                  style={styles.fullScreenBackground}
                  resizeMode="cover"
                >
                  <View style={styles.overlay} />
                  <View style={styles.contentContainer}>
                    <View style={styles.emojiContainer}>
                      {/* <Text style={styles.emoji}>📊</Text> */}
                    </View>
                    <View style={styles.textContainer}>
                      <Text style={styles.heading}>
                        Healthy Animals, Happy Farm!.
                      </Text>
                      <Text style={styles.description}>
                       Track your animals with ease — monitor health, vaccinations, and breeding right from your phone. Keep your livestock thriving and your farm growing strong!
                      </Text>
                    </View>
                  </View>
                </ImageBackground>
              </View>
            ),
            title: "",
            subtitle: "",
          },
          {
            backgroundColor: "transparent",
            image: (
              <View style={styles.fullScreenContainer}>
                <ImageBackground 
                  source={backgroundImage3} 
                  style={styles.fullScreenBackground}
                  resizeMode="cover"
                >
                  <View style={styles.overlay} />
                  <View style={styles.contentContainer}>
                    <View style={styles.emojiContainer}>
                      {/* <Text style={styles.emoji}>🌾</Text> */}
                    </View>
                    <View style={styles.textContainer}>
                      <Text style={styles.heading}>
                        Spot Plant Problems Instantly!
                      </Text>
                      <Text style={styles.description}>
                        Use the AI Crop Doctor to scan your crops and detect plant diseases in seconds. Just snap a photo and let smart technology keep your farm healthy!
                      </Text>
                    </View>
                  </View>
                </ImageBackground>
              </View>
            ),
            title: "",
            subtitle: "",
          },
          {
            backgroundColor: "transparent",
            image: (
              <View style={styles.fullScreenContainer}>
                <ImageBackground 
                  source={backgroundImage4} 
                  style={styles.fullScreenBackground}
                  resizeMode="cover"
                >
                  <View style={styles.overlay} />
                  <View style={styles.contentContainer}>
                    <View style={styles.emojiContainer}>
                      {/* <Text style={styles.emoji}>🌾</Text> */}
                    </View>
                    <View style={styles.textContainer}>
                      <Text style={styles.heading}>
                        Never Miss a Farm Task!
                      </Text>
                      <Text style={styles.description}>
                        Your Smart Crop Calendar reminds you when to plant, water, and harvest — right on time, every time. Farming just got a whole lot easier!
                      </Text>
                    </View>
                  </View>
                </ImageBackground>
              </View>
            ),
            title: "",
            subtitle: "",
          },
          {
            backgroundColor: "transparent",
            image: (
              <View style={styles.fullScreenContainer}>
                <ImageBackground 
                  source={backgroundImage5} 
                  style={styles.fullScreenBackground}
                  resizeMode="cover"
                >
                  <View style={styles.overlay} />
                  <View style={styles.contentContainer}>
                    <View style={styles.emojiContainer}>
                      {/* <Text style={styles.emoji}>🌾</Text> */}
                    </View>
                    <View style={styles.textContainer}>
                      <Text style={styles.heading}>
                        Buy. Sell. Grow Together!
                      </Text>
                      <Text style={styles.description}>
                        Connect with other farmers, buy farm supplies, and sell your produce directly in the Digital Marketplace. Farming made simple and rewarding!
                      </Text>
                    </View>
                  </View>
                </ImageBackground>
              </View>
            ),
            title: "",
            subtitle: "",
          },
          {
            backgroundColor: "transparent",
            image: (
              <View style={styles.fullScreenContainer}>
                <ImageBackground 
                  source={backgroundImage6} 
                  style={styles.fullScreenBackground}
                  resizeMode="cover"
                >
                  <View style={styles.overlay} />
                  <View style={styles.contentContainer}>
                    <View style={styles.emojiContainer}>
                      {/* <Text style={styles.emoji}>🌾</Text> */}
                    </View>
                    <View style={styles.textContainer}>
                      <Text style={styles.heading}>
                        Know Your Earnings in a Tap!
                      </Text>
                      <Text style={styles.description}>
                        Take the guesswork out of farming finances! The Smart Profit Calculator helps you track expenses, calculate profits, and make confident business decisions.
                      </Text>
                    </View>
                  </View>
                </ImageBackground>
              </View>
            ),
            title: "",
            subtitle: "",
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  onboardingContainer: {
    paddingBottom: 60,
  },
  fullScreenContainer: {
    width: width,
    height: height,
  },
  fullScreenBackground: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: height * 0.15,
    paddingBottom: height * 0.25,
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 80,
  },
  logo: {
    width: 400,
    height: 550,
    resizeMode: "contain",
  },
  emojiContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  emoji: {
    fontSize: 80,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 1,
    lineHeight: 34,
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 16,
    color: '#E8F5E8',
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: 0.3,
    paddingHorizontal: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: '#4CAF50',
    width: 20,
  },
  dotInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  buttonContainer: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  skipButtonContainer: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginLeft: 16,
  },
  skipButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '500',
  },
  title: {
    fontSize: 0,
  },
  subtitle: {
    fontSize: 0,
  },
});

export default OnboardingScreen;