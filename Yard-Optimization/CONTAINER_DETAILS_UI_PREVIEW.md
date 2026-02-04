# Container Details Modal - UI/UX Preview

## 🎨 Design Overview

A modern, comprehensive container details modal with **6 organized tabs** showing all 70+ database fields in an intuitive, visually appealing layout.

---

## 📐 Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ Container Details Modal - CMAU2682396          [Export] [X] │
│ CNT-0034-EVT-1 | Event #1                                   │
├─────────────────────────────────────────────────────────────┤
│ [Basic Info] [Vessel & Voyage] [Location] [Event] [Ops] [Metrics] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Tab Content (Scrollable)                                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📑 Tab 1: Basic Information

### Visual Elements
- **Status Badges** (Top): Cleared (Green) | Priority 3 (Yellow) | Hazmat 🔥 | Reefer ❄️ | Rehandled ↔️
- **4 Organized Sections**:

```
┌─ Container Specifications ──────────────────────────────────┐
│ • Container Number: CMAU2682396                             │
│ • ISO Code: 45G1                                            │
│ • Size (TEU): 2 TEU                                         │
│ • Container Type: Dry                                       │
│ • Load Status: Full                                         │
│ • Type: export_container                                    │
└─────────────────────────────────────────────────────────────┘

┌─ Weight & Cargo ────────────────────────────────────────────┐
│ • Weight: 24.4 MT                                           │
│ • Weight Class: Heavy                                       │
│ • Cargo Description: Dry                                    │
│ • Seal Number: N/A                                          │
└─────────────────────────────────────────────────────────────┘

┌─ Shipping Documentation ────────────────────────────────────┐
│ • Shipping Bill: SB268546                                   │
│ • Bill of Lading: N/A                                       │
│ • Customs Status: Cleared                                   │
│ • Shipping Line: N/A                                        │
│ • Consignee: N/A                                            │
└─────────────────────────────────────────────────────────────┘

┌─ Special Handling Requirements ─────────────────────────────┐
│ (Only shown if Hazmat or Reefer)                            │
│ Hazmat: IMDG Class | UN Number | Segregation                │
│ Reefer: Set Temp | Current Temp | Ventilation | Humidity   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📑 Tab 2: Vessel & Voyage

```
┌─ Vessel Information ────────────────────────────────────────┐
│ 🚢 Vessel ID: V007                                          │
│    Voyage ID: VOY-2501-KOC-07                              │
│    Port of Discharge: Kochi                                 │
│    POD Priority: 3                                          │
└─────────────────────────────────────────────────────────────┘

┌─ Voyage Timing ─────────────────────────────────────────────┐
│ 📅 Expected Pickup: Jan 18, 2025 9:28 AM                   │
│    Actual Voyage DateTime: Jan 18, 2025 9:26 AM           │
│    Cutoff DateTime: Jan 18, 2025 2:28 PM                  │
│    Gate In Time: Jan 15, 2025 5:51 AM                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 📑 Tab 3: Location

```
┌─ Current Location ──────────────────────────────────────────┐
│ 📍 Location ID: N/A                                         │
│    Block ID: N/A                                            │
│    Stack ID: N/A                                            │
│    Bay: N/A | Row: N/A | Tier: 0                           │
│    Yard Zone: Sea-Side                                      │
│    Stack Height After Move: 0                               │
└─────────────────────────────────────────────────────────────┘

┌─ Movement Details ──────────────────────────────────────────┐
│ 🧭 From Location          →  To Location                    │
│    ┌─────────────────┐      ┌─────────────────┐            │
│    │ Gate            │  →   │ Yard            │            │
│    │ GATE-2          │      │ Sea-Side        │            │
│    └─────────────────┘      └─────────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

---

## 📑 Tab 4: Event Details

```
┌─ Event Information ─────────────────────────────────────────┐
│ 📊 Event Sequence: 1                                        │
│    Movement ID: MOV-116DA83603                             │
│    Event Type: Gate In                                      │
│    Movement Type: Gate In                                   │
│    Container Status: In Transit                             │
│    Reason: Export cargo arrival from CFS/ICD                │
└─────────────────────────────────────────────────────────────┘

┌─ Timing & Delays ───────────────────────────────────────────┐
│ ⏰ Planned Timestamp: Jan 15, 2025 5:51 AM                 │
│    Actual Timestamp: Jan 15, 2025 5:51 AM                  │
│    Delay: None                                              │
│    Dwell Time: 0.0 hrs                                      │
│    Dwell Since Last Event: 0 min                            │
│    Total Dwell Time: 0 min                                  │
└─────────────────────────────────────────────────────────────┘

┌─ Exception (If any) ────────────────────────────────────────┐
│ ⚠️  Exception Reported                                      │
│    [Exception reason displayed here]                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 📑 Tab 5: Operations

```
┌─ Equipment & Personnel ─────────────────────────────────────┐
│ 🚛 Equipment ID: TT-10                                      │
│    Equipment Type: internal truck                           │
│    Operator ID: OP-012                                      │
│    Job ID: JOB-17B6709E                                     │
└─────────────────────────────────────────────────────────────┘

┌─ Optimization Status ───────────────────────────────────────┐
│ ⚙️  Move Intent: Planned                                    │
│    Optimality Tag: Optimal                                  │
│    Rehandle Count: 0                                        │
│    Rehandle Flag: No                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 📑 Tab 6: Metrics

### Utilization Cards (with Progress Bars)

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ Yard Utilization │  │Block Utilization │  │ Congestion Level │
│                  │  │                  │  │                  │
│   61.9%          │  │   24.8%          │  │    MEDIUM        │
│ ████████░░░░░░   │  │ ███░░░░░░░░░░░   │  │  [Yellow Badge] │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

### Performance Summary

```
┌─────────────────────────────────────────────────────────────┐
│ Total Dwell Time           │ 0.0 hrs                        │
│ Rehandle Operations        │ 0                              │
│ Optimization Status        │ [Optimal Badge]                │
│ Movement Plan              │ [Planned Badge]                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 Color Scheme

### Status Badges
- **Cleared**: `🟢 Green` - bg-green-500/10, text-green-700
- **Hold**: `🔴 Red` - bg-red-500/10, text-red-700
- **Pending**: `🟡 Yellow` - bg-yellow-500/10, text-yellow-700

### Priority Levels
- **Priority 1**: `🔴 Red` - Urgent
- **Priority 2**: `🟠 Orange` - High
- **Priority 3**: `🟡 Yellow` - Medium
- **Priority 4**: `🟢 Green` - Low

### Congestion Levels
- **High**: `🔴 Red` - bg-red-500/10
- **Medium**: `🟡 Yellow` - bg-yellow-500/10
- **Low**: `🟢 Green` - bg-green-500/10

### Utilization Thresholds
- **≥80%**: `🔴 Red` - Over capacity
- **60-80%**: `🟡 Yellow` - Getting full
- **<60%**: `🟢 Green` - Good capacity

### Special Flags
- **Hazmat**: `🔥 Red badge` with flame icon
- **Reefer**: `❄️ Blue badge` with snowflake icon
- **Rehandled**: `↔️ Red badge` with arrows icon

---

## 🚀 Interactive Features

### 1. Tab Navigation
- Click any tab to switch views
- Keyboard navigation supported
- Active tab highlighted

### 2. Scrollable Content
- Smooth scrolling within modal
- Maintains header/tabs position
- Works on mobile devices

### 3. Action Buttons
- **Export**: Download container data as JSON
- **Close (X)**: Close modal
- Click outside to close

### 4. Responsive Grid
- **Desktop**: 3 columns for info items
- **Tablet**: 2 columns
- **Mobile**: 1 column (stacked)

---

## 📱 Responsive Behavior

### Desktop (>1024px)
- Modal width: 1200px (max-w-6xl)
- Full 6-tab navigation
- 3-column grid layouts

### Tablet (768-1024px)
- Modal width: 90% viewport
- 6 tabs (may scroll horizontally on smaller tablets)
- 2-column grid layouts

### Mobile (<768px)
- Modal width: 95% viewport
- Tabs scroll horizontally
- 1-column grid (stacked)
- Touch-friendly tap targets

---

## 💡 Special Sections

### Hazmat Container Display
When `hazmat_flag = true`:
```
┌─ ⚠️  Special Handling Requirements ─────────────────────────┐
│ 🔥 Hazmat Container                                         │
│                                                              │
│ • IMDG Class: Class 3                                       │
│ • UN Number: UN1234                                         │
│ • Segregation: Keep away from food items                   │
└─────────────────────────────────────────────────────────────┘
```

### Reefer Container Display
When `reefer_flag = true`:
```
┌─ ❄️  Special Handling Requirements ─────────────────────────┐
│ ❄️  Reefer Container                                        │
│                                                              │
│ • Set Temperature: -18°C                                    │
│ • Current Temperature: -17.5°C                              │
│ • Ventilation: Closed                                       │
│ • Humidity: 85%                                             │
└─────────────────────────────────────────────────────────────┘
```

### Exception Alert
When `exception_flag = true`:
```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️  Exception Reported                                      │
│                                                              │
│ Delay at gate due to customs inspection required            │
└─────────────────────────────────────────────────────────────┘
```
*Displayed with red background and border*

---

## 🔧 Technical Details

### Component Props
```typescript
interface ContainerDetailsModalProps {
  containerId: string | null;  // Container ID to fetch
  open: boolean;               // Modal open state
  onClose: () => void;         // Close handler
}
```

### Data Fetching
- **API Call**: `GET /containers/{containerId}`
- **Loading State**: Animated spinner
- **Error Handling**: Toast notification
- **Caching**: None (fetches fresh on each open)

### Performance
- **Lazy Loading**: Only fetches when modal opens
- **Optimized Rendering**: Conditional sections (Hazmat/Reefer)
- **Lightweight**: No heavy dependencies

---

## ✨ User Experience Highlights

1. **Clear Visual Hierarchy**: Icons, headers, and sections guide the eye
2. **Consistent Layout**: Same grid pattern across all tabs
3. **Contextual Information**: Related data grouped together
4. **Status at a Glance**: Color-coded badges for quick assessment
5. **Comprehensive Yet Organized**: 70+ fields without feeling overwhelming
6. **Professional Appearance**: Clean, modern design with subtle shadows
7. **Accessible**: Keyboard navigation, screen reader friendly
8. **Mobile-Optimized**: Works great on all device sizes

---

## 🎯 Design Principles Applied

- **Proximity**: Related information grouped together
- **Alignment**: Consistent grid and spacing
- **Contrast**: Clear hierarchy with colors and typography
- **Repetition**: Consistent patterns throughout
- **White Space**: Breathing room between sections
- **Visual Weight**: Important info stands out

---

This modal provides a complete, professional view of all container data with excellent UX!
