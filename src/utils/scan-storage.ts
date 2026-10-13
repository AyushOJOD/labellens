import AsyncStorage from "@react-native-async-storage/async-storage";

const SCANS_KEY = "@labellens/scans";

export type ScanRecord = {
  id: string;
  scannedAt: string;
  productName: string;
  category: string;
  headline: string;
  analysis: any;
};

export async function getScans(): Promise<ScanRecord[]> {
  try {
    const stored = await AsyncStorage.getItem(SCANS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Failed to load scan history:", error);
    return [];
  }
}

export async function saveScan(scan: ScanRecord): Promise<void> {
  const scans = await getScans();
  await AsyncStorage.setItem(SCANS_KEY, JSON.stringify([scan, ...scans]));
}

export async function deleteScan(id: string): Promise<void> {
  const scans = await getScans();
  await AsyncStorage.setItem(
    SCANS_KEY,
    JSON.stringify(scans.filter((scan) => scan.id !== id)),
  );
}
