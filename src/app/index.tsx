import {
  deleteScan,
  getScans,
  saveScan,
  type ScanRecord,
} from "@/utils/scan-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Tab = "Home" | "History" | "Profile";

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("Home");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [historyScans, setHistoryScans] = useState<ScanRecord[]>([]);

  async function handleAnalyze() {
    if (!selectedImage) {
      Alert.alert(
        "No image selected",
        "Please select a nutrition label first.",
      );
      return;
    }

    setIsAnalyzing(true);
    setAnalysis(null);

    try {
      const uploadResult = await FileSystem.uploadAsync(
        "http://192.168.29.101:5000/api/analyze/image",
        selectedImage,
        {
          httpMethod: "POST",
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: "image",
          mimeType: "image/jpeg",
          parameters: {},
        },
      );

      const result = JSON.parse(uploadResult.body);

      if (uploadResult.status < 200 || uploadResult.status >= 300) {
        throw new Error(
          result.message || result.error || "Could not analyze this product.",
        );
      }

      console.log("LabelLens API response:", JSON.stringify(result, null, 2));

      setAnalysis(result);

      await saveScan({
        id: `${Date.now()}`,
        scannedAt: new Date().toISOString(),
        productName: result.data?.productName ?? "Unknown product",
        category: result.data?.category ?? "Unknown",
        headline: result.evaluation?.headline ?? "Analysis completed",
        analysis: result,
      });
    } catch (error) {
      console.error("LabelLens analysis error:", error);

      const message =
        error instanceof Error ? error.message : "Something went wrong.";

      Alert.alert("Analysis failed", message);
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleScan() {
    Alert.alert(
      "Scan a product",
      "Choose how you want to add the nutrition label.",
      [
        {
          text: "Take a photo",
          onPress: async () => {
            const permission =
              await ImagePicker.requestCameraPermissionsAsync();

            if (!permission.granted) {
              Alert.alert(
                "Camera permission required",
                "Please allow camera access to scan a product.",
              );
              return;
            }

            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ["images"],
              allowsEditing: true,
              quality: 0.8,
            });

            if (!result.canceled) {
              setSelectedImage(result.assets[0].uri);
            }
          },
        },
        {
          text: "Choose from gallery",
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ["images"],
              allowsEditing: true,
              quality: 0.8,
            });

            if (!result.canceled) {
              setSelectedImage(result.assets[0].uri);
            }
          },
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
    );
  }

  async function handleTabPress(tab: Tab) {
    setActiveTab(tab);

    if (tab === "History") {
      try {
        const scans = await getScans();
        setHistoryScans(scans);
      } catch (error) {
        console.error("Failed to load history:", error);
        Alert.alert("Error", "Could not load your scan history.");
      }
    }
  }

  async function handleDeleteScan(id: string) {
    Alert.alert(
      "Delete scan?",
      "This scan will be removed from your history.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteScan(id);
              setHistoryScans((previous) =>
                previous.filter((scan) => scan.id !== id),
              );
            } catch (error) {
              console.error("Failed to delete scan:", error);
              Alert.alert("Error", "Could not delete this scan.");
            }
          },
        },
      ],
    );
  }

  function handleOpenScan(scan: ScanRecord) {
    setAnalysis(scan.analysis);
    setActiveTab("Home");
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F8F2" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>L</Text>
            </View>

            <Text style={styles.brandName}>LabelLens</Text>
          </View>

          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>EAT SMARTER</Text>
          </View>
        </View>

        {activeTab === "History" ? (
          <View style={styles.historyContainer}>
            <Text style={styles.historyEyebrow}>YOUR COLLECTION</Text>
            <Text style={styles.historyTitle}>Scan history</Text>
            <Text style={styles.historySubtitle}>
              Revisit the nutrition insights from products you scanned.
            </Text>

            {historyScans.length === 0 ? (
              <View style={styles.historyEmpty}>
                <Text style={styles.historyEmptyEmoji}>📋</Text>
                <Text style={styles.historyEmptyTitle}>Nothing here yet</Text>
                <Text style={styles.historyEmptyText}>
                  Your analyzed products will appear here. Scan your first
                  product to get started.
                </Text>

                <Pressable
                  style={styles.historyScanButton}
                  onPress={() => setActiveTab("Home")}
                >
                  <Text style={styles.historyScanButtonText}>
                    Scan a product →
                  </Text>
                </Pressable>
              </View>
            ) : (
              historyScans.map((scan) => (
                <View key={scan.id} style={styles.historyCard}>
                  <Pressable
                    style={styles.historyCardContent}
                    onPress={() => handleOpenScan(scan)}
                  >
                    <View style={styles.historyCardTop}>
                      <View style={styles.historyProductIcon}>
                        <Text style={styles.historyProductEmoji}>🥣</Text>
                      </View>

                      <View style={styles.historyProductInfo}>
                        <Text
                          style={styles.historyProductName}
                          numberOfLines={2}
                        >
                          {scan.productName}
                        </Text>
                        <Text style={styles.historyCategory}>
                          {scan.category}
                        </Text>
                      </View>

                      <Text style={styles.historyArrow}>↗</Text>
                    </View>

                    <Text style={styles.historyHeadline} numberOfLines={3}>
                      {scan.headline}
                    </Text>

                    <Text style={styles.historyDate}>
                      {new Date(scan.scannedAt).toLocaleString()}
                    </Text>

                    <Text style={styles.historyOpenHint}>
                      Tap to view analysis
                    </Text>
                  </Pressable>

                  <Pressable
                    style={styles.historyDeleteButton}
                    onPress={() => handleDeleteScan(scan.id)}
                  >
                    <Text style={styles.historyDeleteText}>Delete scan</Text>
                  </Pressable>
                </View>
              ))
            )}
          </View>
        ) : (
          <>
            {/* Hero */}
            <View style={styles.hero}></View>

            {/* Hero */}
            <View style={styles.hero}>
              <Text style={styles.eyebrow}>YOUR FOOD, UNDERSTOOD</Text>

              <Text style={styles.title}>
                Know what’s{"\n"}inside your{" "}
                <Text style={styles.titleAccent}>food.</Text>
              </Text>

              <Text style={styles.subtitle}>
                Confusing nutrition labels? Scan a product and let LabelLens
                break it down into simple, meaningful insights.
              </Text>
            </View>

            {/* Scan card */}
            <View style={styles.scanCard}>
              <View style={styles.scanCardTop}>
                <View style={styles.scanIcon}>
                  <Text style={styles.scanEmoji}>📷</Text>
                </View>

                <View style={styles.scanLabel}>
                  <Text style={styles.scanTitle}>Scan a product</Text>
                  <Text style={styles.scanDescription}>
                    Packaged food · Drinks · Snacks
                  </Text>
                </View>
              </View>

              <View style={styles.preview}>
                {selectedImage ? (
                  <Image
                    source={{ uri: selectedImage }}
                    style={styles.selectedImage}
                    resizeMode="contain"
                  />
                ) : (
                  <>
                    <View style={styles.previewCircle}>
                      <Text style={styles.previewEmoji}>🥣</Text>
                    </View>

                    <Text style={styles.previewTitle}>
                      From label to clarity
                    </Text>

                    <Text style={styles.previewSubtitle}>
                      Understand the nutrition, not just the numbers.
                    </Text>
                  </>
                )}
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.scanButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleScan}
                accessibilityRole="button"
                accessibilityLabel="Scan a product"
              >
                <Text style={styles.scanButtonText}>
                  {historyScans.length > 0
                    ? "Scan a product"
                    : "Scan your first product"}
                </Text>
                <Text style={styles.scanButtonArrow}>→</Text>
              </Pressable>

              {selectedImage && (
                <Pressable
                  style={[
                    styles.scanButton,
                    { marginTop: 10, backgroundColor: "#4D895D" },
                    isAnalyzing && { opacity: 0.7 },
                  ]}
                  onPress={handleAnalyze}
                  disabled={isAnalyzing}
                  accessibilityRole="button"
                >
                  <Text style={styles.scanButtonText}>
                    {isAnalyzing ? "Analyzing product..." : "Analyze nutrition"}
                  </Text>
                </Pressable>
              )}

              <Text style={styles.privacyNote}>
                No barcode database required to get started
              </Text>
            </View>

            {analysis?.success && (
              <View style={styles.resultCard}>
                <Text style={styles.resultEyebrow}>YOUR ANALYSIS</Text>

                <Text style={styles.resultTitle}>
                  {analysis.data?.productName || "Product analysis"}
                </Text>

                <Text style={styles.resultCategory}>
                  {analysis.data?.category || "Food product"}
                </Text>

                <Text style={styles.resultHeadline}>
                  {analysis.evaluation?.headline || "Analysis completed"}
                </Text>

                <Text style={styles.resultSectionTitle}>Nutrition facts</Text>

                {Object.entries(analysis.data?.nutrition || {}).map(
                  ([key, value]) => (
                    <View key={key} style={styles.nutritionRow}>
                      <Text style={styles.nutritionLabel}>
                        {key
                          .replace(/([A-Z])/g, " $1")
                          .replace(/^./, (c) => c.toUpperCase())}
                      </Text>
                      <Text style={styles.nutritionValue}>
                        {value == null ? "N/A" : String(value)}
                      </Text>
                    </View>
                  ),
                )}

                <Text style={styles.resultSectionTitle}>What stands out</Text>

                {analysis.evaluation?.findings?.length ? (
                  analysis.evaluation.findings.map(
                    (finding: any, index: number) => (
                      <View
                        key={`${finding.nutrient}-${index}`}
                        style={styles.findingCard}
                      >
                        <View style={styles.findingHeader}>
                          <Text style={styles.findingNutrient}>
                            {finding.label
                              ? finding.label.charAt(0).toUpperCase() +
                                finding.label.slice(1)
                              : "Nutrient"}
                          </Text>

                          <View
                            style={[
                              styles.severityBadge,
                              finding.level === "high"
                                ? styles.severityHigh
                                : finding.level === "moderate"
                                  ? styles.severityModerate
                                  : styles.severityOther,
                            ]}
                          >
                            <Text
                              style={[
                                styles.severityText,
                                finding.level === "high"
                                  ? styles.severityHighText
                                  : finding.level === "moderate"
                                    ? styles.severityModerateText
                                    : styles.severityOtherText,
                              ]}
                            >
                              {finding.level
                                ? finding.level.charAt(0).toUpperCase() +
                                  finding.level.slice(1)
                                : "Review"}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.findingValueRow}>
                          <Text style={styles.findingValue}>
                            {finding.value ?? "N/A"}
                          </Text>
                          <Text style={styles.findingUnit}>
                            {finding.unit ?? ""}
                            {" / "}
                            {finding.basis === "per_100g"
                              ? "100 g"
                              : finding.basis === "per_100ml"
                                ? "100 ml"
                                : (finding.basis ?? "serving")}
                          </Text>
                        </View>

                        <Text style={styles.findingExplanation}>
                          {finding.explanation ||
                            "Review this nutrient as part of the overall nutrition profile."}
                        </Text>
                      </View>
                    ),
                  )
                ) : (
                  <Text style={styles.stepDescription}>
                    No notable findings were returned for this product.
                  </Text>
                )}

                {analysis.evaluation?.profile ===
                  "illustrative-development-v1" && (
                  <Text style={styles.disclaimer}>
                    These findings use illustrative development thresholds. They
                    are informational and are not official regulatory
                    classifications.
                  </Text>
                )}
              </View>
            )}

            {/* How it works */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>How it works</Text>
              <Text style={styles.sectionSubtitle}>
                Three simple steps to make informed choices.
              </Text>

              <View style={styles.stepRow}>
                <View style={styles.stepIcon}>
                  <Text style={styles.stepEmoji}>📸</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>01. Scan the label</Text>
                  <Text style={styles.stepDescription}>
                    Capture the nutrition information on the package.
                  </Text>
                </View>
              </View>

              <View style={styles.stepRow}>
                <View style={styles.stepIcon}>
                  <Text style={styles.stepEmoji}>🔍</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>
                    02. Understand the numbers
                  </Text>
                  <Text style={styles.stepDescription}>
                    Get a clearer picture of sugar, salt, fats and more.
                  </Text>
                </View>
              </View>

              <View style={styles.stepRow}>
                <View style={styles.stepIcon}>
                  <Text style={styles.stepEmoji}>💡</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>03. Make your choice</Text>
                  <Text style={styles.stepDescription}>
                    See useful context to help compare similar products.
                  </Text>
                </View>
              </View>
            </View>

            {/* Footer */}
            <Text style={styles.footer}>Better informed. Better choices.</Text>
          </>
        )}
      </ScrollView>

      {/* Bottom navigation */}
      <View style={styles.bottomNav}>
        {(
          [
            { name: "Home", icon: "⌂" },
            { name: "History", icon: "◷" },
            { name: "Profile", icon: "○" },
          ] as const
        ).map((tab) => {
          const selected = activeTab === tab.name;

          return (
            <Pressable
              key={tab.name}
              style={styles.navItem}
              onPress={() => handleTabPress(tab.name)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text style={[styles.navIcon, selected && styles.navIconActive]}>
                {tab.icon}
              </Text>
              <Text
                style={[styles.navLabel, selected && styles.navLabelActive]}
              >
                {tab.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F8F2",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 22,
    paddingBottom: 28,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
    paddingBottom: 24,
  },
  selectedImage: {
    width: "100%",
    height: 220,
    borderRadius: 14,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "#245C43",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
  },
  brandName: {
    color: "#173C2D",
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  headerBadge: {
    backgroundColor: "#E5EEDF",
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  headerBadgeText: {
    color: "#356448",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },
  hero: {
    paddingTop: 10,
    paddingBottom: 24,
  },
  eyebrow: {
    color: "#54815D",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 12,
  },
  title: {
    color: "#183B2D",
    fontSize: 39,
    lineHeight: 45,
    fontWeight: "800",
    letterSpacing: -1.5,
  },
  titleAccent: {
    color: "#4D895D",
  },
  subtitle: {
    color: "#6D786F",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 13,
    maxWidth: 340,
  },
  scanCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 25,
    padding: 17,
    borderWidth: 1,
    borderColor: "#E7EDE3",
  },
  scanCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 17,
  },
  scanIcon: {
    width: 47,
    height: 47,
    borderRadius: 15,
    backgroundColor: "#EAF2E6",
    alignItems: "center",
    justifyContent: "center",
  },
  scanEmoji: {
    fontSize: 23,
  },
  scanLabel: {
    flex: 1,
  },
  scanTitle: {
    color: "#203D2D",
    fontSize: 17,
    fontWeight: "800",
  },
  scanDescription: {
    color: "#818B81",
    fontSize: 11,
    marginTop: 4,
  },
  preview: {
    backgroundColor: "#F1F5EB",
    borderRadius: 19,
    minHeight: 150,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  previewCircle: {
    width: 59,
    height: 59,
    borderRadius: 30,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
  },
  previewEmoji: {
    fontSize: 30,
  },
  previewTitle: {
    color: "#264D37",
    fontSize: 15,
    fontWeight: "800",
  },
  previewSubtitle: {
    color: "#778475",
    fontSize: 11,
    textAlign: "center",
    marginTop: 5,
  },
  scanButton: {
    backgroundColor: "#245C43",
    borderRadius: 15,
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    paddingHorizontal: 15,
  },
  buttonPressed: {
    opacity: 0.82,
  },
  scanButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  scanButtonArrow: {
    color: "#FFFFFF",
    fontSize: 21,
    marginLeft: 10,
  },
  privacyNote: {
    color: "#8A9388",
    fontSize: 10,
    textAlign: "center",
    marginTop: 11,
  },
  section: {
    marginTop: 30,
  },
  sectionTitle: {
    color: "#1B3E2D",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  sectionSubtitle: {
    color: "#818A80",
    fontSize: 12,
    marginTop: 6,
    marginBottom: 17,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    gap: 13,
  },
  stepIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#E8EFE2",
    alignItems: "center",
    justifyContent: "center",
  },
  stepEmoji: {
    fontSize: 22,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    color: "#294634",
    fontSize: 13,
    fontWeight: "800",
  },
  stepDescription: {
    color: "#808A80",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },
  footer: {
    color: "#779078",
    fontSize: 11,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  bottomNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E8EDE5",
    paddingTop: 10,
    paddingBottom: 7,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: 3,
  },
  navIcon: {
    color: "#9AA59A",
    fontSize: 23,
    lineHeight: 27,
  },
  navIconActive: {
    color: "#245C43",
  },
  navLabel: {
    color: "#9AA59A",
    fontSize: 10,
    fontWeight: "600",
  },
  navLabelActive: {
    color: "#245C43",
    fontWeight: "800",
  },

  resultCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#E1EADD",
  },
  resultEyebrow: {
    color: "#54815D",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
  },
  resultTitle: {
    color: "#183B2D",
    fontSize: 23,
    fontWeight: "800",
    marginTop: 10,
  },
  resultCategory: {
    color: "#818A80",
    fontSize: 12,
    marginTop: 4,
  },
  resultHeadline: {
    color: "#356448",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
    marginTop: 15,
    marginBottom: 10,
  },
  resultSectionTitle: {
    color: "#183B2D",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 18,
    marginBottom: 8,
  },
  nutritionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF0E9",
  },
  nutritionLabel: {
    color: "#687568",
    fontSize: 12,
    flex: 1,
  },
  nutritionValue: {
    color: "#244832",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 12,
  },
  findingRow: {
    backgroundColor: "#F1F5EB",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  findingText: {
    color: "#35523D",
    fontSize: 12,
    lineHeight: 19,
  },

  findingCard: {
    backgroundColor: "#F5F7F0",
    borderRadius: 17,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E8EDE1",
  },
  findingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  findingNutrient: {
    color: "#244832",
    fontSize: 16,
    fontWeight: "800",
    textTransform: "capitalize",
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
  },
  severityHigh: {
    backgroundColor: "#FCE8E5",
  },
  severityModerate: {
    backgroundColor: "#FFF0D4",
  },
  severityOther: {
    backgroundColor: "#E5EEE5",
  },
  severityText: {
    fontSize: 11,
    fontWeight: "800",
  },
  severityHighText: {
    color: "#B42318",
  },
  severityModerateText: {
    color: "#925C08",
  },
  severityOtherText: {
    color: "#356448",
  },
  findingValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 7,
    marginTop: 13,
  },
  findingValue: {
    color: "#244832",
    fontSize: 29,
    fontWeight: "800",
    letterSpacing: -0.7,
  },
  findingUnit: {
    color: "#788476",
    fontSize: 12,
  },
  findingExplanation: {
    color: "#647365",
    fontSize: 12,
    lineHeight: 19,
    marginTop: 9,
  },
  disclaimer: {
    color: "#7C8679",
    fontSize: 10,
    lineHeight: 16,
    marginTop: 3,
  },
  historyContainer: {
    paddingTop: 10,
    paddingBottom: 20,
  },
  historyEyebrow: {
    color: "#54815D",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
  },
  historyTitle: {
    color: "#183B2D",
    fontSize: 31,
    fontWeight: "800",
    letterSpacing: -0.8,
    marginTop: 8,
  },
  historySubtitle: {
    color: "#6D786F",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 22,
  },
  historyEmpty: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E7EDE3",
    padding: 24,
    alignItems: "center",
    marginTop: 8,
  },
  historyEmptyEmoji: {
    fontSize: 36,
    marginBottom: 12,
  },
  historyEmptyTitle: {
    color: "#183B2D",
    fontSize: 19,
    fontWeight: "800",
  },
  historyEmptyText: {
    color: "#778475",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8,
  },
  historyScanButton: {
    backgroundColor: "#245C43",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  historyScanButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  historyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "#E7EDE3",
    marginBottom: 14,
    overflow: "hidden",
  },
  historyCardContent: {
    padding: 16,
  },
  historyCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  historyProductIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "#EAF2E6",
    alignItems: "center",
    justifyContent: "center",
  },
  historyProductEmoji: {
    fontSize: 24,
  },
  historyProductInfo: {
    flex: 1,
  },
  historyProductName: {
    color: "#203D2D",
    fontSize: 15,
    fontWeight: "800",
  },
  historyCategory: {
    color: "#818B81",
    fontSize: 11,
    marginTop: 4,
  },
  historyArrow: {
    color: "#4D895D",
    fontSize: 22,
    fontWeight: "700",
  },
  historyHeadline: {
    color: "#356448",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
    marginTop: 16,
  },
  historyDate: {
    color: "#8A9388",
    fontSize: 10,
    marginTop: 12,
  },
  historyOpenHint: {
    color: "#54815D",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 8,
  },
  historyDeleteButton: {
    borderTopWidth: 1,
    borderTopColor: "#EDF0E9",
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  historyDeleteText: {
    color: "#B42318",
    fontSize: 12,
    fontWeight: "700",
  },
});
