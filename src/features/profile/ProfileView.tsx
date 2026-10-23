import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Pressable,
  Alert,
} from "react-native";
import {
  getUserProfile,
  saveUserProfile,
  DEFAULT_PROFILE,
  COMMON_ALLERGENS,
  type UserDietaryProfile,
} from "@/utils/profile-storage";

interface ProfileViewProps {
  onProfileUpdated?: (updated: UserDietaryProfile) => void;
}

export default function ProfileView({ onProfileUpdated }: ProfileViewProps) {
  const [profile, setProfile] = useState<UserDietaryProfile>(DEFAULT_PROFILE);
  const [isSavedToastVisible, setIsSavedToastVisible] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const data = await getUserProfile();
    setProfile(data);
  }

  async function updateProfile(updated: UserDietaryProfile) {
    setProfile(updated);
    await saveUserProfile(updated);
    if (onProfileUpdated) {
      onProfileUpdated(updated);
    }
    showSavedToast();
  }

  function showSavedToast() {
    setIsSavedToastVisible(true);
    setTimeout(() => {
      setIsSavedToastVisible(false);
    }, 1800);
  }

  function toggleSwitch(key: keyof Omit<UserDietaryProfile, "allergens">) {
    const updated = {
      ...profile,
      [key]: !profile[key],
    };
    updateProfile(updated);
  }

  function toggleAllergen(allergen: string) {
    const exists = profile.allergens.includes(allergen);
    const updatedAllergens = exists
      ? profile.allergens.filter((a) => a !== allergen)
      : [...profile.allergens, allergen];

    const updated = {
      ...profile,
      allergens: updatedAllergens,
    };
    updateProfile(updated);
  }

  function handleReset() {
    Alert.alert(
      "Reset Preferences",
      "Reset your dietary preferences and health filters back to default?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => updateProfile(DEFAULT_PROFILE),
        },
      ],
    );
  }

  // Count active guards
  const activeGuardsCount =
    (profile.diabeticFriendly ? 1 : 0) +
    (profile.lowSodium ? 1 : 0) +
    (profile.pureVeg ? 1 : 0) +
    (profile.avoidPalmOil ? 1 : 0) +
    (profile.avoidSweeteners ? 1 : 0) +
    (profile.avoidColors ? 1 : 0) +
    (profile.avoidFlavorEnhancers ? 1 : 0) +
    profile.allergens.length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarEmoji}>🛡️</Text>
        </View>
        <View style={styles.headerTextCol}>
          <Text style={styles.eyebrow}>PERSONAL HEALTH PROFILE</Text>
          <Text style={styles.title}>Health & Dietary Filters</Text>
          <Text style={styles.subtitle}>
            Custom alerts tailored to your body on every scan.
          </Text>
        </View>
      </View>

      {/* Active Guards Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryLeft}>
          <Text style={styles.summaryBadge}>
            {activeGuardsCount} ACTIVE GUARDS
          </Text>
          <Text style={styles.summaryTitle}>
            {activeGuardsCount === 0
              ? "No filters active"
              : ${activeGuardsCount} personalized alert on}
          </Text>
          <Text style={styles.summaryDesc}>
            Saved locally in private phone storage. Never uploaded to the cloud.
          </Text>
        </View>
        {isSavedToastVisible && (
          <View style={styles.savedPill}>
            <Text style={styles.savedPillText}>✓ Saved</Text>
          </View>
        )}
      </View>

      {/* SECTION 1: Health & Lifestyle */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeaderTitle}>🩺 Health & Lifestyle Goals</Text>
        <Text style={styles.sectionHeaderSubtitle}>
          Prioritize metabolic, blood sugar, and cardiovascular health.
        </Text>

        {/* Diabetic / Sugar Toggle */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleTextCol}>
            <View style={styles.toggleTitleRow}>
              <Text style={styles.toggleTitle}>Diabetic / Low-Sugar Alert</Text>
              <Text style={styles.miniTagRed}>&gt;5g sugar</Text>
            </View>
            <Text style={styles.toggleDesc}>
              Flags high sugar content and hidden glycemic spikes like maltodextrin and invert syrup.
            </Text>
          </View>
          <Switch
            value={profile.diabeticFriendly}
            onValueChange={() => toggleSwitch("diabeticFriendly")}
            trackColor={{ false: "#E5E7EB", true: "#059669" }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.divider} />

        {/* Hypertension / Sodium Toggle */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleTextCol}>
            <View style={styles.toggleTitleRow}>
              <Text style={styles.toggleTitle}>Low-Sodium Alert</Text>
              <Text style={styles.miniTagAmber}>&gt;400mg</Text>
            </View>
            <Text style={styles.toggleDesc}>
              Warns if sodium exceeds 400 mg per 100g to help control blood pressure.
            </Text>
          </View>
          <Switch
            value={profile.lowSodium}
            onValueChange={() => toggleSwitch("lowSodium")}
            trackColor={{ false: "#E5E7EB", true: "#059669" }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.divider} />

        {/* Pure Veg Toggle */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleTextCol}>
            <View style={styles.toggleTitleRow}>
              <Text style={styles.toggleTitle}>Pure Vegetarian (Green Dot)</Text>
              <Text style={styles.miniTagGreen}>100% Veg</Text>
            </View>
            <Text style={styles.toggleDesc}>
              Flags animal fats, gelatin, and non-vegetarian food additives.
            </Text>
          </View>
          <Switch
            value={profile.pureVeg}
            onValueChange={() => toggleSwitch("pureVeg")}
            trackColor={{ false: "#E5E7EB", true: "#059669" }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* SECTION 2: Ingredient Avoidance */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeaderTitle}>🌴 Ingredient Avoidance</Text>
        <Text style={styles.sectionHeaderSubtitle}>
          Catch ultra-processed oils and industrial chemical additives.
        </Text>

        {/* Palm Oil */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleTextCol}>
            <View style={styles.toggleTitleRow}>
              <Text style={styles.toggleTitle}>Avoid Palm Oil & Palmolein</Text>
            </View>
            <Text style={styles.toggleDesc}>
              Alerts if refined palm oil, fractionated palmolein, or vanaspati is detected.
            </Text>
          </View>
          <Switch
            value={profile.avoidPalmOil}
            onValueChange={() => toggleSwitch("avoidPalmOil")}
            trackColor={{ false: "#E5E7EB", true: "#059669" }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.divider} />

        {/* Artificial Sweeteners */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleTextCol}>
            <View style={styles.toggleTitleRow}>
              <Text style={styles.toggleTitle}>Avoid Artificial Sweeteners</Text>
            </View>
            <Text style={styles.toggleDesc}>
              Flags Sucralose (INS 955), Aspartame (INS 951), Acesulfame K (INS 950), Saccharin.
            </Text>
          </View>
          <Switch
            value={profile.avoidSweeteners}
            onValueChange={() => toggleSwitch("avoidSweeteners")}
            trackColor={{ false: "#E5E7EB", true: "#059669" }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.divider} />

        {/* Synthetic Colors */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleTextCol}>
            <View style={styles.toggleTitleRow}>
              <Text style={styles.toggleTitle}>Avoid Synthetic Food Dyes</Text>
            </View>
            <Text style={styles.toggleDesc}>
              Flags Tartrazine (INS 102), Sunset Yellow (INS 110), Carmoisine (INS 122), etc.
            </Text>
          </View>
          <Switch
            value={profile.avoidColors}
            onValueChange={() => toggleSwitch("avoidColors")}
            trackColor={{ false: "#E5E7EB", true: "#059669" }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.divider} />

        {/* MSG / Flavor Enhancers */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleTextCol}>
            <View style={styles.toggleTitleRow}>
              <Text style={styles.toggleTitle}>Avoid MSG & Flavor Enhancers</Text>
            </View>
            <Text style={styles.toggleDesc}>
              Flags Monosodium glutamate (INS 621), Disodium inosinate & guanylate (INS 627, 631, 635).
            </Text>
          </View>
          <Switch
            value={profile.avoidFlavorEnhancers}
            onValueChange={() => toggleSwitch("avoidFlavorEnhancers")}
            trackColor={{ false: "#E5E7EB", true: "#059669" }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* SECTION 3: Allergens */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeaderTitle}>⚠️ My Allergens</Text>
        <Text style={styles.sectionHeaderSubtitle}>
          Select ingredients you are allergic to for prominent safety warnings.
        </Text>

        <View style={styles.allergenChipContainer}>
          {COMMON_ALLERGENS.map((allergen) => {
            const isSelected = profile.allergens.includes(allergen);
            return (
              <Pressable
                key={allergen}
                style={[
                  styles.allergenChip,
                  isSelected && styles.allergenChipSelected,
                ]}
                onPress={() => toggleAllergen(allergen)}
              >
                <Text
                  style={[
                    styles.allergenChipText,
                    isSelected && styles.allergenChipTextSelected,
                  ]}
                >
                  {isSelected ? ✓  : + }
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Reset Button */}
      <Pressable style={styles.resetButton} onPress={handleReset}>
        <Text style={styles.resetButtonText}>Reset to Default Preferences</Text>
      </Pressable>

      <Text style={styles.footerNote}>
        LabelLens stores your health preferences securely in device storage.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 4,
    paddingTop: 12,
    paddingBottom: 36,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 14,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#E6F4EA",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#C3E6CD",
  },
  avatarEmoji: {
    fontSize: 26,
  },
  headerTextCol: {
    flex: 1,
  },
  eyebrow: {
    color: "#54815D",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  title: {
    color: "#183B2D",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 2,
  },
  subtitle: {
    color: "#6D786F",
    fontSize: 12,
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: "#183B2D",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  summaryLeft: {
    flex: 1,
  },
  summaryBadge: {
    color: "#86EFAC",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  summaryTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 4,
  },
  summaryDesc: {
    color: "#C3DAC8",
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },
  savedPill: {
    backgroundColor: "#059669",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#34D399",
  },
  savedPillText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#EDF0E9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeaderTitle: {
    color: "#183B2D",
    fontSize: 16,
    fontWeight: "800",
  },
  sectionHeaderSubtitle: {
    color: "#778475",
    fontSize: 12,
    marginTop: 4,
    marginBottom: 14,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    gap: 12,
  },
  toggleTextCol: {
    flex: 1,
  },
  toggleTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toggleTitle: {
    color: "#1F2937",
    fontSize: 14,
    fontWeight: "700",
  },
  toggleDesc: {
    color: "#6B7280",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  miniTagRed: {
    backgroundColor: "#FEE2E2",
    color: "#DC2626",
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniTagAmber: {
    backgroundColor: "#FEF3C7",
    color: "#D97706",
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniTagGreen: {
    backgroundColor: "#DCFCE7",
    color: "#16A34A",
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 4,
  },
  allergenChipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  allergenChip: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  allergenChipSelected: {
    backgroundColor: "#FEE2E2",
    borderColor: "#F87171",
  },
  allergenChipText: {
    color: "#4B5563",
    fontSize: 12,
    fontWeight: "600",
  },
  allergenChipTextSelected: {
    color: "#B91C1C",
    fontWeight: "800",
  },
  resetButton: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    marginTop: 6,
    marginBottom: 10,
  },
  resetButtonText: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "700",
  },
  footerNote: {
    color: "#9CA3AF",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
    marginTop: 4,
  },
});
