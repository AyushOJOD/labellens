# LabelLens Frontend - Feature Log & Architecture

This document tracks all features, UI screens, components, and user experience flows implemented in the LabelLens React Native Expo mobile application. It is continuously updated whenever changes or new features are introduced.

---

## 📌 Feature History

### 1. Expo Router Mobile Framework
- **Files**: `src/app/_layout.tsx`, `src/app/index.tsx`, `package.json`
- **What it does**:
  - Built with Expo SDK 57, React Native 0.86, and Expo Router.
  - Custom forest-green nature theme (`#183B2D`, `#245C43`, `#F7F8F2`).
  - Three-tab navigation layout: **Home**, **History**, and **Profile**.

### 2. Camera & Photo Scanner
- **Files**: `src/app/index.tsx`
- **What it does**:
  - Native camera and photo gallery picker using `expo-image-picker`.
  - Prompts camera permissions and enables cropping/framing of the nutrition label.
  - Image preview card with status indicators.
  - Added Supermarket Guidance Card: *"💡 Supermarket Tip: Photograph the back panel's Nutrition Facts table for the best accuracy."*

### 3. Multipart API Client
- **Files**: `src/app/index.tsx`
- **What it does**:
  - Uses `expo-file-system/legacy` `uploadAsync` for multipart file uploads directly to the LabelLens Express backend (`/api/analyze/image`).
  - Graceful error handling for unreadable images, invalid inputs, and network timeouts.

### 4. Local Scan History (AsyncStorage)
- **Files**: `src/utils/scan-storage.ts`, `src/app/index.tsx`
- **What it does**:
  - Automatically saves each scanned product report locally on device with timestamps and product names.
  - History screen lets users re-open past analyses or delete scans from their local library.

### 5. Traffic Light Risk Overview & Indian Consumer Badges
- **Files**: `src/features/analysis/AnalysisResults.tsx`
- **What it does**:
  - **Traffic Light Status Banner**:
    - 🔴 `HIGH HFSS ALERT` (Red): Triggered when high fat, sugar, or sodium breach FSSAI limits.
    - 🟡 `CONSUME IN MODERATION` (Amber): Triggered when moderate concern is detected.
    - 🟢 `BALANCED CHOICE` (Green): Triggered when all nutrients are within balanced criteria.
    - `🇮🇳 FSSAI & ICMR 2024` badge.
  - **Indian Consumer Snapshot Badges**:
    - 🥄 Teaspoons of sugar chip (`~X tsp sugar`).
    - 🧂 Daily sodium quota chip (`X% daily sodium limit`).
    - 🧈 Saturated / Palm oil warning chip.
    - ✅ Zero trans fat compliance chip.
  - **Structured Nutrition Facts Table**: Cleanly formatted nutrient labels with hierarchical nesting for sub-nutrients (`Energy`, `Total Fat`, `  ↳ Saturated Fat`, `Total Sugars`, `  ↳ Added Sugars`, etc.).

### 6. Ingredients & Additives Breakdown Card
- **Files**: `src/features/analysis/AnalysisResults.tsx`
- **What it does**:
  - **Palm Oil Alert Card**: Highlights when palm oil or refined palmolein is present, or displays a green `Palm Oil Free` confirmation if absent.
  - **Hidden Sugar Alert**: Displays tags for identified hidden sugars (e.g. *Maltodextrin, Invert Sugar Syrup*) explaining their glycemic impact.
  - **Chemical Additives Breakdown**: Lists identified INS codes with their common name, category badge (Sweetener, Food Color, Flavor Enhancer, Preservative), and practical explanation.
  - **Allergen Alert Pills**: Highlights common allergens (*Gluten/Wheat, Milk, Soy, Peanuts*, etc.).
  - **Expandable Raw Ingredients Viewer**: Lets users toggle and read the exact printed ingredients list from the package.

### 7. Live Barcode Scanner (Instant 1-Second Mode)
- **Files**: `src/features/barcode/BarcodeScannerModal.tsx`, `src/app/index.tsx`, `package.json`
- **What it does**:
  - Installed and configured `expo-camera` with native barcode detection for EAN-13, EAN-8, UPC-A, UPC-E, and Code-128.
  - **Live Camera Viewfinder**: Fullscreen camera modal with a stylized target frame, green alignment corners, red laser guide line, and flashlight (torch) toggle.
  - **Instant 1-Second Lookup**: Instantly queries the backend API (`/api/barcode/:code`) upon detecting a barcode without needing to snap or compress photos.
  - **Fallback Manual Input**: If the barcode on a crumpled wrapper is smudged or unscannable, users can tap *"Enter barcode digits manually"* to type or paste the 8-14 digit code.
  - **Seamless Report Generation**: Automatically pipes barcode analysis into the Traffic Light Report, Indian Consumer Snapshot, and Ingredients Breakdown cards.

### 8. UI Layout & Margin Polish
- **Files**: `src/app/index.tsx`, `src/features/analysis/AnalysisResults.tsx`
- **What it does**:
  - Re-engineered the scan button action container with balanced `flexDirection: "space-between"` layout so titles, icons, and arrows never overflow or push against card edges.
  - Added rounded icon badges (`📸` and `🏷️`) and clean two-line captions (*"Scan Nutrition Label - Photo AI analysis"* and *"Scan Barcode - Instant 1-sec lookup"*).
  - Fixed `topRow` flex-wrap and badge padding in `AnalysisResults.tsx` so the `🇮🇳 FSSAI & ICMR 2024` pill and product titles stay strictly within card boundaries on all screen widths.
  - Reduced title and banner font scale to prevent clipping of text such as *"HIGH HFSS / CONCERN ALERT"*.

### 9. Barcode Scanner State Reset & Timeout Guard
- **Files**: `src/features/barcode/BarcodeScannerModal.tsx`, `labellens-backend/src/modules/products/open-food-facts.client.ts`
- **What was fixed**:
  - Resolved loading freeze bug where closing or pressing Back during a barcode search left `isScanning` stuck as `true`.
  - Added an active `useEffect` listener to immediately abort pending network requests and reset `isScanning: false`, `manualCode: ""`, and `torchEnabled: false` whenever the modal closes.
  - Added a visible **"Cancel Search"** button directly on the loading spinner overlay so users can cancel searches instantly without closing the camera.
  - Implemented 6s backend and 7s client-side timeouts using `AbortController` so network stalls on Open Food Facts never hang the UI indefinitely.

### 10. Instant Cache Acceleration & Database Growth
- **Files**: src/features/barcode/BarcodeScannerModal.tsx, src/app/index.tsx
- **What it does**:
  - Leverages the backend's self-growing persistent auto-cache for instant sub-millisecond barcode lookups.
  - Popular Indian staples (Maggi, Parle-G, Lay's, Kurkure, Bhujia, Dairy Milk, Coke, etc.) scan and render instantly without waiting for external web APIs.
  - When users scan packaged items or capture labels with barcodes, the products are seamlessly saved to the backend database, speeding up lookups for all subsequent scans.
