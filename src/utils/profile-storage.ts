import AsyncStorage from "@react-native-async-storage/async-storage";

const PROFILE_KEY = "@labellens/user_profile";

export interface UserDietaryProfile {
  diabeticFriendly: boolean;
  lowSodium: boolean;
  pureVeg: boolean;
  avoidPalmOil: boolean;
  avoidSweeteners: boolean;
  avoidColors: boolean;
  avoidFlavorEnhancers: boolean;
  allergens: string[];
}

export const COMMON_ALLERGENS = [
  "Gluten / Wheat",
  "Milk / Dairy",
  "Peanuts",
  "Tree nuts",
  "Soy",
  "Mustard",
  "Sesame",
  "Sulphites",
] as const;

export const DEFAULT_PROFILE: UserDietaryProfile = {
  diabeticFriendly: false,
  lowSodium: false,
  pureVeg: false,
  avoidPalmOil: true,
  avoidSweeteners: true,
  avoidColors: true,
  avoidFlavorEnhancers: false,
  allergens: [],
};

export async function getUserProfile(): Promise<UserDietaryProfile> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export async function saveUserProfile(profile: UserDietaryProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.error("Failed to save user profile:", error);
  }
}
