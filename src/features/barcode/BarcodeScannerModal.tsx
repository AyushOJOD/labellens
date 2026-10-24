import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

type BarcodeScannerModalProps = {
  visible: boolean;
  apiBaseUrl: string;
  onClose: () => void;
  onScanSuccess: (analysis: any) => void;
};

export default function BarcodeScannerModal({
  visible,
  apiBaseUrl,
  onClose,
  onScanSuccess,
}: BarcodeScannerModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const isUserCancelledRef = useRef(false);

  // Automatically reset scanning state and cancel pending lookups whenever modal is closed
  useEffect(() => {
    if (!visible) {
      cleanupPendingSearch(true);
      setManualCode("");
      setShowManualInput(false);
      setTorchEnabled(false);
    }
  }, [visible]);

  function cleanupPendingSearch(isUserAction = false) {
    if (isUserAction) {
      isUserCancelledRef.current = true;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsScanning(false);
  }

  function handleClose() {
    cleanupPendingSearch(true);
    setManualCode("");
    setShowManualInput(false);
    setTorchEnabled(false);
    onClose();
  }

  function handleCancelSearch() {
    cleanupPendingSearch(true);
  }

  async function handleBarcodeLookup(barcode: string) {
    if (isScanning) return;
    setIsScanning(true);
    isUserCancelledRef.current = false;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Safety timeout: 35 seconds to comfortably allow for cloud server cold-starts
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 35000);

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/barcode/${encodeURIComponent(barcode)}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);
      abortControllerRef.current = null;

      const result = await response.json();

      if (response.ok && result.success) {
        setIsScanning(false);
        onClose();
        onScanSuccess(result);
      } else {
        setIsScanning(false);
        Alert.alert(
          "Product Not Found",
          result.message ||
            "This barcode is not registered in the database yet. Please take a photo of the nutrition label.",
          [
            { text: "Try another barcode", onPress: () => setIsScanning(false) },
            {
              text: "Take Photo Instead",
              style: "cancel",
              onPress: () => {
                handleClose();
              },
            },
          ],
        );
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      abortControllerRef.current = null;
      setIsScanning(false);

      // If user deliberately canceled or closed modal, silently return without errors
      if (isUserCancelledRef.current) {
        isUserCancelledRef.current = false;
        return;
      }

      const isCanceledOrTimeout =
        error?.name === "AbortError" ||
        error?.message?.toLowerCase().includes("cancel") ||
        error?.message?.toLowerCase().includes("abort") ||
        error?.cause?.name === "AbortError";

      if (isCanceledOrTimeout) {
        Alert.alert(
          "Lookup Timed Out",
          "The server took too long to respond. The cloud database may be waking up from sleep. Please try scanning again in a few moments, or take a photo of the label.",
          [{ text: "OK" }],
        );
        return;
      }

      Alert.alert(
        "Lookup Failed",
        "Unable to connect to the LabelLens server. Please check your network connection.",
        [{ text: "OK" }],
      );
    }
  }

  function handleBarcodeScanned({ data }: { data: string }) {
    if (!isScanning && data) {
      handleBarcodeLookup(data);
    }
  }

  function handleManualSubmit() {
    const cleaned = manualCode.trim();
    if (!/^\d{8,14}$/.test(cleaned)) {
      Alert.alert("Invalid Barcode", "Please enter a valid 8 to 14 digit barcode number.");
      return;
    }
    handleBarcodeLookup(cleaned);
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕ Close</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Barcode Scanner</Text>
          <Pressable
            onPress={() => setTorchEnabled(!torchEnabled)}
            style={styles.torchButton}
          >
            <Text style={styles.torchButtonText}>{torchEnabled ? "🔦 On" : "🔦 Off"}</Text>
          </Pressable>
        </View>

        {/* Camera Scanner View */}
        {!permission?.granted ? (
          <View style={styles.permissionBox}>
            <Text style={styles.permissionEmoji}>📷</Text>
            <Text style={styles.permissionTitle}>Camera Access Required</Text>
            <Text style={styles.permissionText}>
              LabelLens needs camera access to scan barcodes on product packaging instantly.
            </Text>
            <Pressable style={styles.grantButton} onPress={requestPermission}>
              <Text style={styles.grantButtonText}>Enable Camera</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.cameraWrapper}>
            <CameraView
              style={StyleSheet.absoluteFill}
              enableTorch={torchEnabled}
              barcodeScannerSettings={{
                barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128"],
              }}
              onBarcodeScanned={isScanning ? undefined : handleBarcodeScanned}
            />

            {/* Target Viewfinder Overlay */}
            <View style={styles.overlay}>
              <View style={styles.targetFrame}>
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
                <View style={styles.scanLine} />
              </View>
              <Text style={styles.overlayHint}>
                Align barcode within frame for instant lookup
              </Text>
            </View>
          </View>
        )}

        {/* Loading Overlay with Cancel Button */}
        {isScanning && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#4ADE80" />
            <Text style={styles.loadingText}>Looking up product in database...</Text>
            <Pressable style={styles.cancelSearchButton} onPress={handleCancelSearch}>
              <Text style={styles.cancelSearchButtonText}>Cancel Search</Text>
            </Pressable>
          </View>
        )}

        {/* Manual Barcode Input Section */}
        <View style={styles.bottomSection}>
          <Pressable
            onPress={() => setShowManualInput(!showManualInput)}
            style={styles.manualToggle}
          >
            <Text style={styles.manualToggleText}>
              {showManualInput ? "▲ Hide Manual Entry" : "⌨️ Can't scan? Enter barcode digits manually ▼"}
            </Text>
          </Pressable>

          {showManualInput && (
            <View style={styles.manualInputRow}>
              <TextInput
                style={styles.input}
                placeholder="e.g. 8901030383748"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                value={manualCode}
                onChangeText={setManualCode}
                maxLength={14}
              />
              <Pressable
                style={[styles.submitButton, isScanning && { opacity: 0.6 }]}
                onPress={handleManualSubmit}
                disabled={isScanning}
              >
                <Text style={styles.submitButtonText}>Check</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1A12",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 54,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: "#122A1E",
  },
  closeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#1F4231",
  },
  closeButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  torchButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#1F4231",
  },
  torchButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  cameraWrapper: {
    flex: 1,
    position: "relative",
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  targetFrame: {
    width: 270,
    height: 170,
    position: "relative",
    backgroundColor: "transparent",
  },
  corner: {
    position: "absolute",
    width: 26,
    height: 26,
    borderColor: "#4ADE80",
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  scanLine: {
    position: "absolute",
    left: 10,
    right: 10,
    top: "50%",
    height: 2,
    backgroundColor: "#EF4444",
  },
  overlayHint: {
    color: "#E2E8F0",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 24,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  permissionBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  permissionEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  permissionTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },
  permissionText: {
    color: "#94A3B8",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 24,
  },
  grantButton: {
    backgroundColor: "#22C55E",
    paddingVertical: 14,
    paddingHorizontal: 26,
    borderRadius: 14,
  },
  grantButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  loadingText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 14,
    marginBottom: 16,
  },
  cancelSearchButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  cancelSearchButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  bottomSection: {
    backgroundColor: "#122A1E",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#1F4231",
  },
  manualToggle: {
    alignItems: "center",
    paddingVertical: 6,
  },
  manualToggleText: {
    color: "#86EFAC",
    fontSize: 12,
    fontWeight: "700",
  },
  manualInputRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  input: {
    flex: 1,
    backgroundColor: "#1A3828",
    color: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "600",
    borderWidth: 1,
    borderColor: "#2D5A42",
  },
  submitButton: {
    backgroundColor: "#22C55E",
    borderRadius: 12,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonText: {
    color: "#0B1A12",
    fontSize: 13,
    fontWeight: "800",
  },
});
