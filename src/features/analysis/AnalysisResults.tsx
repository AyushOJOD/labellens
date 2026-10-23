import React, { useState, useEffect } from "react";
import { getUserProfile, type UserDietaryProfile } from "@/utils/profile-storage";
import { Pressable, StyleSheet, Text, View } from "react-native";

type NutritionFinding = {
  nutrient: string;
  label: string;
  level: "high" | "moderate" | "other";
  value: number;
  unit: string;
  basis: string;
  threshold?: number;
  explanation: string;
};

type IngredientAdditive = {
  code: string;
  name: string;
  category: "sweetener" | "color" | "flavor_enhancer" | "preservative" | "emulsifier" | "other";
  description: string;
};

type IngredientsAnalysis = {
  rawIngredientsText: string | null;
  hasPalmOil: boolean;
  palmOilType?: string;
  hiddenSugars: string[];
  additives: IngredientAdditive[];
  allergens: string[];
  summary: string;
};

type AnalysisResultsProps = {
  analysis: any;
};

const NUTRIENT_METADATA: Record<
  string,
  { label: string; unit: string; isSubItem?: boolean; icon?: string }
> = {
  caloriesKcal: { label: "Energy / Calories", unit: "kcal", icon: "⚡" },
  totalFatG: { label: "Total Fat", unit: "g", icon: "🧈" },
  saturatedFatG: { label: "Saturated Fat", unit: "g", isSubItem: true },
  transFatG: { label: "Trans Fat", unit: "g", isSubItem: true },
  carbohydratesG: { label: "Carbohydrates", unit: "g", icon: "🌾" },
  sugarsG: { label: "Total Sugars", unit: "g", isSubItem: true },
  addedSugarsG: { label: "Added Sugars", unit: "g", isSubItem: true },
  proteinG: { label: "Protein", unit: "g", icon: "💪" },
  fiberG: { label: "Dietary Fiber", unit: "g", icon: "🥗" },
  sodiumMg: { label: "Sodium", unit: "mg", icon: "🧂" },
  monounsaturatedFatG: { label: "Monounsaturated Fat", unit: "g", isSubItem: true },
  polyunsaturatedFatG: { label: "Polyunsaturated Fat", unit: "g", isSubItem: true },
};

export default function AnalysisResults({ analysis }: AnalysisResultsProps) {
  const [userProfile, setUserProfile] = useState<UserDietaryProfile | null>(null);

  useEffect(() => {
    getUserProfile().then(setUserProfile);
  }, [analysis]);
  const [showFullIngredients, setShowFullIngredients] = useState(false);

  if (!analysis?.success) {
    return null;
  }

  const data = analysis.data || {};
  const evaluation = analysis.evaluation || {};
  const findings: NutritionFinding[] = evaluation.findings || [];
  const nutrition = data.nutrition || {};
  const ingredients: IngredientsAnalysis | undefined = evaluation.ingredientsAnalysis;

  // Compute Traffic Light Health Grade
  const hasHighFindings = findings.some((f) => f.level === "high");
  const hasModerateFindings = findings.some((f) => f.level === "moderate");
  const isComplete = evaluation.status === "complete";

  let trafficLight: "green" | "amber" | "red" = "green";
  let trafficLabel = "BALANCED CHOICE";
  let trafficSummary = "No elevated fat, sugar, or sodium flagged under FSSAI criteria.";

  if (hasHighFindings || ingredients?.hasPalmOil) {
    trafficLight = "red";
    trafficLabel = "HIGH HFSS / CONCERN ALERT";
    trafficSummary =
      "High in fat, sugar, or sodium, or contains refined palm oil. Frequent consumption is not recommended.";
  } else if (hasModerateFindings || (ingredients?.hiddenSugars.length ?? 0) > 0 || !isComplete) {
    trafficLight = "amber";
    trafficLabel = "CONSUME IN MODERATION";
    trafficSummary =
      "Contains elevated nutrients or hidden sugars. Balance with whole, unprocessed foods.";
  }

  // Calculate Consumer Quick Badges
  const sugarVal = nutrition.sugarsG ?? null;
  const sugarTsp = sugarVal != null && sugarVal > 0 ? (sugarVal / 4).toFixed(1) : null;

  const sodiumVal = nutrition.sodiumMg ?? null;
  const sodiumDailyPct =
    sodiumVal != null && sodiumVal > 0 ? Math.round((sodiumVal / 2000) * 100) : null;

  const hasHighSatFat = findings.some((f) => f.nutrient === "saturatedFatG");
  const transFatVal = nutrition.transFatG ?? null;

  const nutritionBasisLabel =
    data.nutritionBasis === "per_100ml"
      ? "Per 100 ml"
      : data.nutritionBasis === "per_serving"
        ? `Per serving (${data.servingSize || "pack"}g)`
        : "Per 100 g";

  // Evaluate Personal Health Profile Conflicts
  const personalHealthAlerts: string[] = [];
  if (userProfile) {
    const rawSugar = normalizedNutrition?.sugarsG ?? 0;
    const rawSodium = normalizedNutrition?.sodiumMg ?? 0;

    if (userProfile.avoidPalmOil && ingredientsAnalysis?.hasPalmOil) {
      personalHealthAlerts.push("Contains Palm Oil / Palmolein (matches your avoidance preference)");
    }
    if (userProfile.diabeticFriendly) {
      if (rawSugar > 5) {
        personalHealthAlerts.push(`Elevated Sugar (${rawSugar}g / 100g) exceeds your diabetic target`);
      }
      if (ingredientsAnalysis?.hiddenSugars?.length) {
        personalHealthAlerts.push(`Hidden glycemic spike: ${ingredientsAnalysis.hiddenSugars.join(", ")}`);
      }
    }
    if (userProfile.lowSodium && rawSodium > 400) {
      personalHealthAlerts.push(`High Sodium (${rawSodium}mg / 100g) exceeds your 400mg target`);
    }
    if (userProfile.avoidSweeteners) {
      const sweeteners = (ingredientsAnalysis?.additives || []).filter((a) => a.category === "sweetener");
      if (sweeteners.length > 0) {
        personalHealthAlerts.push(`Contains Artificial Sweeteners: ${sweeteners.map((s) => s.name || s.code).join(", ")}`);
      }
    }
    if (userProfile.avoidColors) {
      const colors = (ingredientsAnalysis?.additives || []).filter((a) => a.category === "color");
      if (colors.length > 0) {
        personalHealthAlerts.push(`Contains Synthetic Food Dyes: ${colors.map((c) => c.name || c.code).join(", ")}`);
      }
    }
    if (userProfile.avoidFlavorEnhancers) {
      const msg = (ingredientsAnalysis?.additives || []).filter((a) => a.category === "flavor_enhancer");
      if (msg.length > 0) {
        personalHealthAlerts.push(`Contains Flavor Enhancers / MSG: ${msg.map((m) => m.name || m.code).join(", ")}`);
      }
    }
    if (userProfile.allergens?.length && ingredientsAnalysis?.allergens?.length) {
      const matched = userProfile.allergens.filter((userAllergen) => {
        const keyword = userAllergen.toLowerCase().split("/")[0].trim();
        return ingredientsAnalysis.allergens.some((item) =>
          item.toLowerCase().includes(keyword)
        );
      });
      if (matched.length > 0) {
        personalHealthAlerts.push(`⛔ ALLERGEN WARNING: Contains ${matched.join(", ")}!`);
      }
    }
  }

  return (
    <View style={styles.resultCard}>
      {/* Eyebrow and Regulatory Tag */}
      <View style={styles.topRow}>
        <Text style={styles.resultEyebrow}>YOUR NUTRITION REPORT</Text>
        <View style={styles.fssaiPill}>
          <Text style={styles.fssaiPillText}>🇮🇳 FSSAI & ICMR 2024</Text>
        </View>
      </View>

      {/* Product Title & Category */}
      <Text style={styles.resultTitle}>
        {data.productName || "Product Analysis"}
      </Text>

      <View style={styles.metaRow}>
        <Text style={styles.resultCategory}>
          🏷️ {data.category ? data.category.replace(/_/g, " ") : "Packaged food"}
        </Text>
        <Text style={styles.metaDot}>•</Text>
        <Text style={styles.resultBasis}>{nutritionBasisLabel}</Text>
      </View>

      {/* Personal Health Match Card */}
  {userProfile && (
    <View
      style={[
        styles.personalMatchCard,
        personalHealthAlerts.length > 0
          ? styles.personalMatchCardAlert
          : styles.personalMatchCardClean,
      ]}
    >
      <View style={styles.personalMatchHeader}>
        <View style={styles.personalMatchTitleRow}>
          <Text style={styles.personalMatchEmoji}>
            {personalHealthAlerts.length > 0 ? "⚠️" : "🛡️"}
          </Text>
          <Text
            style={[
              styles.personalMatchTitle,
              personalHealthAlerts.length > 0
                ? styles.personalMatchTitleAlert
                : styles.personalMatchTitleClean,
            ]}
          >
            YOUR HEALTH PROFILE MATCH
          </Text>
        </View>
        <View
          style={[
            styles.personalMatchBadge,
            personalHealthAlerts.length > 0
              ? styles.personalMatchBadgeAlert
              : styles.personalMatchBadgeClean,
          ]}
        >
          <Text
            style={[
              styles.personalMatchBadgeText,
              personalHealthAlerts.length > 0
                ? styles.personalMatchBadgeTextAlert
                : styles.personalMatchBadgeTextClean,
            ]}
          >
            {personalHealthAlerts.length > 0
              ? `${personalHealthAlerts.length} Alert${personalHealthAlerts.length > 1 ? "s" : ""}`
              : "✓ Safe Match"}
          </Text>
        </View>
      </View>

      {personalHealthAlerts.length > 0 ? (
        <View style={styles.personalAlertsList}>
          {personalHealthAlerts.map((alertText, idx) => (
            <View key={idx} style={styles.personalAlertItem}>
              <Text style={styles.personalAlertBullet}>•</Text>
              <Text style={styles.personalAlertText}>{alertText}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.personalMatchCleanText}>
          No conflicts found with your active dietary and health preferences.
        </Text>
      )}
    </View>
  )}

  {/* Traffic Light Score Banner */}
      <View
        style={[
          styles.trafficBanner,
          trafficLight === "red"
            ? styles.trafficBannerRed
            : trafficLight === "amber"
              ? styles.trafficBannerAmber
              : styles.trafficBannerGreen,
        ]}
      >
        <View style={styles.trafficHeaderRow}>
          <Text style={styles.trafficIcon}>
            {trafficLight === "red" ? "🔴" : trafficLight === "amber" ? "🟡" : "🟢"}
          </Text>
          <Text
            style={[
              styles.trafficTitle,
              trafficLight === "red"
                ? styles.trafficTextRed
                : trafficLight === "amber"
                  ? styles.trafficTextAmber
                  : styles.trafficTextGreen,
            ]}
          >
            {trafficLabel}
          </Text>
        </View>
        <Text
          style={[
            styles.trafficSummary,
            trafficLight === "red"
              ? styles.trafficTextRed
              : trafficLight === "amber"
                ? styles.trafficTextAmber
                : styles.trafficTextGreen,
          ]}
        >
          {trafficSummary}
        </Text>
      </View>

      {/* Quick Indian Consumer Metric Chips */}
      <Text style={styles.resultSectionTitle}>Indian Consumer Snapshot</Text>
      <View style={styles.chipsContainer}>
        {sugarTsp != null && (
          <View style={[styles.chip, Number(sugarTsp) > 3 ? styles.chipWarning : styles.chipInfo]}>
            <Text style={styles.chipEmoji}>🥄</Text>
            <View>
              <Text style={styles.chipTitle}>{sugarTsp} tsp sugar</Text>
              <Text style={styles.chipSubtitle}>~4g per teaspoon</Text>
            </View>
          </View>
        )}

        {sodiumDailyPct != null && (
          <View
            style={[
              styles.chip,
              sodiumDailyPct > 25 ? styles.chipWarning : styles.chipInfo,
            ]}
          >
            <Text style={styles.chipEmoji}>🧂</Text>
            <View>
              <Text style={styles.chipTitle}>{sodiumDailyPct}% daily sodium</Text>
              <Text style={styles.chipSubtitle}>of 2,000 mg ICMR ceiling</Text>
            </View>
          </View>
        )}

        {ingredients?.hasPalmOil ? (
          <View style={[styles.chip, styles.chipDanger]}>
            <Text style={styles.chipEmoji}>🌴</Text>
            <View>
              <Text style={styles.chipTitle}>Palm Oil Detected</Text>
              <Text style={styles.chipSubtitle}>{ingredients.palmOilType || "Palmolein"}</Text>
            </View>
          </View>
        ) : hasHighSatFat ? (
          <View style={[styles.chip, styles.chipWarning]}>
            <Text style={styles.chipEmoji}>🧈</Text>
            <View>
              <Text style={styles.chipTitle}>High Saturated Fat</Text>
              <Text style={styles.chipSubtitle}>Check ingredients list</Text>
            </View>
          </View>
        ) : null}

        {transFatVal != null && (
          <View style={[styles.chip, transFatVal > 0.2 ? styles.chipDanger : styles.chipSuccess]}>
            <Text style={styles.chipEmoji}>{transFatVal > 0.2 ? "⚠️" : "✅"}</Text>
            <View>
              <Text style={styles.chipTitle}>
                {transFatVal > 0.2 ? "High Trans Fat" : "Zero Trans Fat"}
              </Text>
              <Text style={styles.chipSubtitle}>
                {transFatVal > 0.2 ? "Exceeds FSSAI limit" : "Under 0.2g / 100g"}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* INGREDIENTS & ADDITIVES BREAKDOWN */}
      <Text style={styles.resultSectionTitle}>Ingredients & Additives Analysis</Text>

      {ingredients ? (
        <View style={styles.ingredientsBox}>
          {/* Palm Oil Alert */}
          {ingredients.hasPalmOil ? (
            <View style={styles.alertCardDanger}>
              <Text style={styles.alertCardIcon}>🌴</Text>
              <View style={styles.alertCardContent}>
                <Text style={styles.alertCardTitle}>Palm Oil / Palmolein Used</Text>
                <Text style={styles.alertCardBody}>
                  Found "{ingredients.palmOilType}". Palm oil is high in saturated palmitic acid and is commonly used by manufacturers as a cheap frying oil.
                </Text>
              </View>
            </View>
          ) : ingredients.rawIngredientsText ? (
            <View style={styles.alertCardSuccess}>
              <Text style={styles.alertCardIcon}>🌿</Text>
              <View style={styles.alertCardContent}>
                <Text style={styles.alertCardTitleSuccess}>Palm Oil Free</Text>
                <Text style={styles.alertCardBodySuccess}>
                  No palm oil, palmolein, or hydrogenated vegetable fats detected in the ingredients list.
                </Text>
              </View>
            </View>
          ) : null}

          {/* Hidden Sugars Alert */}
          {ingredients.hiddenSugars.length > 0 && (
            <View style={styles.alertCardWarning}>
              <Text style={styles.alertCardIcon}>🍬</Text>
              <View style={styles.alertCardContent}>
                <Text style={styles.alertCardTitleWarning}>
                  Hidden Sugar Aliases Detected ({ingredients.hiddenSugars.length})
                </Text>
                <Text style={styles.alertCardBodyWarning}>
                  Identified: {ingredients.hiddenSugars.join(", ")}. These ingredients raise blood sugar rapidly despite "healthy" front-of-pack claims.
                </Text>
              </View>
            </View>
          )}

          {/* Chemical Additives & INS Codes */}
          {ingredients.additives.length > 0 && (
            <View style={styles.additivesSection}>
              <Text style={styles.subSectionTitle}>
                🧪 Chemical Additives & INS Codes ({ingredients.additives.length})
              </Text>
              {ingredients.additives.map((additive) => (
                <View key={additive.code} style={styles.additiveRow}>
                  <View style={styles.additiveHeader}>
                    <Text style={styles.additiveCode}>{additive.code}</Text>
                    <Text style={styles.additiveName}>{additive.name}</Text>
                    <View style={styles.categoryPill}>
                      <Text style={styles.categoryPillText}>{additive.category.replace(/_/g, " ")}</Text>
                    </View>
                  </View>
                  <Text style={styles.additiveDesc}>{additive.description}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Allergens Notice */}
          {ingredients.allergens.length > 0 && (
            <View style={styles.allergenSection}>
              <Text style={styles.subSectionTitle}>🌾 Potential Allergens</Text>
              <View style={styles.allergenPillsRow}>
                {ingredients.allergens.map((alg) => (
                  <View key={alg} style={styles.allergenPill}>
                    <Text style={styles.allergenPillText}>{alg}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Raw Ingredients Text Viewer */}
          {ingredients.rawIngredientsText && (
            <View style={styles.rawTextContainer}>
              <Pressable
                onPress={() => setShowFullIngredients(!showFullIngredients)}
                style={styles.toggleRow}
              >
                <Text style={styles.toggleText}>
                  {showFullIngredients ? "Hide full ingredients list ▲" : "View full printed ingredients ▼"}
                </Text>
              </Pressable>
              {showFullIngredients && (
                <Text style={styles.rawIngredientsText}>
                  {ingredients.rawIngredientsText}
                </Text>
              )}
            </View>
          )}
        </View>
      ) : (
        <View style={styles.cleanFindingCard}>
          <Text style={styles.cleanFindingEmoji}>ℹ️</Text>
          <Text style={styles.cleanFindingText}>
            Ingredients panel was not visible in this photo. Point camera directly at the "Ingredients:" paragraph on your next scan to analyze additives.
          </Text>
        </View>
      )}

      {/* What Stands Out (Findings) */}
      <Text style={styles.resultSectionTitle}>Nutritional Highlights</Text>

      {findings.length > 0 ? (
        findings.map((finding, index) => {
          const isHigh = finding.level === "high";
          const isModerate = finding.level === "moderate";

          return (
            <View key={`${finding.nutrient}-${index}`} style={styles.findingCard}>
              <View style={styles.findingHeader}>
                <Text style={styles.findingNutrient}>
                  {finding.label
                    ? finding.label.charAt(0).toUpperCase() + finding.label.slice(1)
                    : "Nutrient"}
                </Text>

                <View
                  style={[
                    styles.severityBadge,
                    isHigh
                      ? styles.severityHigh
                      : isModerate
                        ? styles.severityModerate
                        : styles.severityOther,
                  ]}
                >
                  <Text
                    style={[
                      styles.severityText,
                      isHigh
                        ? styles.severityHighText
                        : isModerate
                          ? styles.severityModerateText
                          : styles.severityOtherText,
                    ]}
                  >
                    {isHigh ? "High" : isModerate ? "Moderate" : "Notice"}
                  </Text>
                </View>
              </View>

              <View style={styles.findingValueRow}>
                <Text style={styles.findingValue}>{finding.value ?? "N/A"}</Text>
                <Text style={styles.findingUnit}>
                  {finding.unit ?? ""}
                  {" / "}
                  {finding.basis === "per_100ml"
                    ? "100 ml"
                    : finding.basis === "per_100g"
                      ? "100 g"
                      : (finding.basis ?? "serving")}
                </Text>
                {finding.threshold != null && (
                  <Text style={styles.thresholdText}>
                    (Limit: {finding.threshold} {finding.unit})
                  </Text>
                )}
              </View>

              <Text style={styles.findingExplanation}>
                {finding.explanation ||
                  "Review this nutrient as part of your overall daily diet."}
              </Text>
            </View>
          );
        })
      ) : (
        <View style={styles.cleanFindingCard}>
          <Text style={styles.cleanFindingEmoji}>🌿</Text>
          <Text style={styles.cleanFindingText}>
            No elevated nutrients identified under FSSAI HFSS criteria.
          </Text>
        </View>
      )}

      {/* Structured Nutrition Facts Table */}
      <Text style={styles.resultSectionTitle}>Nutrition Facts Panel</Text>
      <View style={styles.tableContainer}>
        {Object.entries(NUTRIENT_METADATA).map(([key, meta]) => {
          const value = nutrition[key];
          if (value === undefined && key !== "caloriesKcal" && key !== "totalFatG" && key !== "carbohydratesG" && key !== "proteinG" && key !== "sodiumMg") {
            return null;
          }

          return (
            <View
              key={key}
              style={[
                styles.nutritionRow,
                meta.isSubItem ? styles.subNutritionRow : null,
              ]}
            >
              <Text
                style={[
                  styles.nutritionLabel,
                  meta.isSubItem ? styles.subNutritionLabel : null,
                ]}
              >
                {meta.isSubItem ? "  ↳ " : (meta.icon ? `${meta.icon} ` : "")}
                {meta.label}
              </Text>

              <Text
                style={[
                  styles.nutritionValue,
                  meta.isSubItem ? styles.subNutritionValue : null,
                ]}
              >
                {value == null ? "Not stated" : `${value} ${meta.unit}`}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Disclaimers & Regulatory Reference */}
      <Text style={styles.disclaimer}>
        Evaluated against FSSAI Front-of-Pack Labelling benchmarks and ICMR-NIN 2024 Dietary Guidelines for Indian consumers. Informational only; not medical advice.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  resultCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#E1EADD",
    shadowColor: "#183B2D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 6,
  },
  resultEyebrow: {
    color: "#4A7C59",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    flexShrink: 1,
  },
  fssaiPill: {
    backgroundColor: "#EFF6EF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D3E4D1",
    flexShrink: 0,
  },
  fssaiPillText: {
    color: "#2C6339",
    fontSize: 9,
    fontWeight: "700",
  },
  resultTitle: {
    color: "#183B2D",
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "800",
    marginTop: 6,
    letterSpacing: -0.4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 6,
  },
  resultCategory: {
    color: "#6D7A6C",
    fontSize: 12,
    textTransform: "capitalize",
    fontWeight: "600",
  },
  metaDot: {
    color: "#A4B0A3",
    fontSize: 12,
  },
  resultBasis: {
    color: "#6D7A6C",
    fontSize: 12,
    fontWeight: "600",
  },

  // Traffic Light Banner
  trafficBanner: {
    borderRadius: 16,
    padding: 14,
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1,
  },
  trafficBannerRed: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  trafficBannerAmber: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  trafficBannerGreen: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  trafficHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  trafficIcon: {
    fontSize: 14,
  },
  trafficTitle: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  trafficTextRed: {
    color: "#991B1B",
  },
  trafficTextAmber: {
    color: "#92400E",
  },
  trafficTextGreen: {
    color: "#166534",
  },
  trafficSummary: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
    fontWeight: "500",
  },

  // Quick Chips
  resultSectionTitle: {
    color: "#183B2D",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 20,
    marginBottom: 10,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 8,
    flexGrow: 1,
    minWidth: "45%",
    borderWidth: 1,
  },
  chipInfo: {
    backgroundColor: "#F4F7F2",
    borderColor: "#E3EBE0",
  },
  chipWarning: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FDE68A",
  },
  chipDanger: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FECACA",
  },
  chipSuccess: {
    backgroundColor: "#DCFCE7",
    borderColor: "#BBF7D0",
  },
  chipEmoji: {
    fontSize: 18,
  },
  chipTitle: {
    color: "#1F2937",
    fontSize: 12,
    fontWeight: "800",
  },
  chipSubtitle: {
    color: "#6B7280",
    fontSize: 10,
    fontWeight: "500",
  },

  // Ingredients Analysis Box
  ingredientsBox: {
    backgroundColor: "#FAFBF8",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E6ECE2",
    gap: 12,
  },
  alertCardDanger: {
    flexDirection: "row",
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
    gap: 10,
  },
  alertCardIcon: {
    fontSize: 20,
  },
  alertCardContent: {
    flex: 1,
  },
  alertCardTitle: {
    color: "#991B1B",
    fontSize: 13,
    fontWeight: "800",
  },
  alertCardBody: {
    color: "#7F1D1D",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  alertCardSuccess: {
    flexDirection: "row",
    backgroundColor: "#F0FDF4",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    gap: 10,
  },
  alertCardTitleSuccess: {
    color: "#166534",
    fontSize: 13,
    fontWeight: "800",
  },
  alertCardBodySuccess: {
    color: "#14532D",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  alertCardWarning: {
    flexDirection: "row",
    backgroundColor: "#FFFBEB",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
    gap: 10,
  },
  alertCardTitleWarning: {
    color: "#92400E",
    fontSize: 13,
    fontWeight: "800",
  },
  alertCardBodyWarning: {
    color: "#78350F",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  subSectionTitle: {
    color: "#183B2D",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8,
  },
  additivesSection: {
    marginTop: 4,
  },
  additiveRow: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#EBEFE8",
  },
  additiveHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  additiveCode: {
    backgroundColor: "#F3F4F6",
    color: "#1F2937",
    fontSize: 11,
    fontWeight: "800",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  additiveName: {
    color: "#183B2D",
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },
  categoryPill: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryPillText: {
    color: "#92400E",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  additiveDesc: {
    color: "#6B7280",
    fontSize: 11,
    lineHeight: 15,
    marginTop: 4,
  },
  allergenSection: {
    marginTop: 2,
  },
  allergenPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  allergenPill: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  allergenPillText: {
    color: "#991B1B",
    fontSize: 11,
    fontWeight: "700",
  },
  rawTextContainer: {
    borderTopWidth: 1,
    borderTopColor: "#EAEFE6",
    paddingTop: 10,
    marginTop: 4,
  },
  toggleRow: {
    paddingVertical: 4,
  },
  toggleText: {
    color: "#3B7A57",
    fontSize: 12,
    fontWeight: "700",
  },
  rawIngredientsText: {
    color: "#4B5563",
    fontSize: 11,
    lineHeight: 16,
    backgroundColor: "#F5F8F3",
    padding: 10,
    borderRadius: 10,
    marginTop: 6,
    fontStyle: "italic",
  },

  // Findings Cards
  findingCard: {
    backgroundColor: "#F7F9F5",
    borderRadius: 16,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E6ECE2",
  },
  findingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  findingNutrient: {
    color: "#223E2F",
    fontSize: 15,
    fontWeight: "800",
    textTransform: "capitalize",
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityHigh: {
    backgroundColor: "#FEE2E2",
  },
  severityModerate: {
    backgroundColor: "#FEF3C7",
  },
  severityOther: {
    backgroundColor: "#E2ECE2",
  },
  severityText: {
    fontSize: 10,
    fontWeight: "800",
  },
  severityHighText: {
    color: "#991B1B",
  },
  severityModerateText: {
    color: "#92400E",
  },
  severityOtherText: {
    color: "#275438",
  },
  findingValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginTop: 8,
  },
  findingValue: {
    color: "#183B2D",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  findingUnit: {
    color: "#6D7A6C",
    fontSize: 12,
    fontWeight: "600",
  },
  thresholdText: {
    color: "#9CA3AF",
    fontSize: 11,
    fontStyle: "italic",
    marginLeft: 4,
  },
  findingExplanation: {
    color: "#4B5563",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  cleanFindingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F0FDF4",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  cleanFindingEmoji: {
    fontSize: 20,
  },
  cleanFindingText: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },

  // Nutrition Table
  tableContainer: {
    backgroundColor: "#FAFCF9",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#E8EFE5",
  },
  nutritionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF2EA",
  },
  subNutritionRow: {
    paddingLeft: 10,
    backgroundColor: "#F6FAF4",
    borderBottomColor: "#EAF0E6",
  },
  nutritionLabel: {
    color: "#374151",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  subNutritionLabel: {
    color: "#4B5563",
    fontSize: 12,
    fontWeight: "500",
  },
  nutritionValue: {
    color: "#183B2D",
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 12,
  },
  subNutritionValue: {
    color: "#374151",
    fontSize: 12,
    fontWeight: "600",
  },
  disclaimer: {
    color: "#839181",
    fontSize: 10,
    lineHeight: 15,
    marginTop: 18,
    textAlign: "center",
  },
  // Personal Health Match Card
  personalMatchCard: {
    borderRadius: 16,
    padding: 14,
    marginTop: 14,
    marginBottom: 6,
    borderWidth: 1.5,
  },
  personalMatchCardAlert: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  personalMatchCardClean: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  personalMatchHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  personalMatchTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  personalMatchEmoji: {
    fontSize: 15,
  },
  personalMatchTitle: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  personalMatchTitleAlert: {
    color: "#B45309",
  },
  personalMatchTitleClean: {
    color: "#15803D",
  },
  personalMatchBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  personalMatchBadgeAlert: {
    backgroundColor: "#FEE2E2",
  },
  personalMatchBadgeClean: {
    backgroundColor: "#DCFCE7",
  },
  personalMatchBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  personalMatchBadgeTextAlert: {
    color: "#B91C1C",
  },
  personalMatchBadgeTextClean: {
    color: "#15803D",
  },
  personalAlertsList: {
    marginTop: 10,
    gap: 6,
  },
  personalAlertItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  personalAlertBullet: {
    color: "#DC2626",
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "900",
  },
  personalAlertText: {
    color: "#78350F",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
    flex: 1,
  },
  personalMatchCleanText: {
    color: "#166534",
    fontSize: 12,
    marginTop: 6,
    lineHeight: 17,
    fontWeight: "500",
  },
});