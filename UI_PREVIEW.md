# Arc Scanner - Item Tracker UI Preview

## Main Application with Navigation

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                            Arc Scanner                                     ║
║            Interactive Item Relationship Graph for Arc Raiders             ║
║                                                                           ║
║  ┌─────────────┐  ┌─────────────┐               [Import Arc Raiders Data]║
║  │ Graph View  │  │Item Tracker │                                        ║
║  └─────────────┘  └─────────────┘                                        ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  Content Area - Shows either Graph View or Item Tracker                  ║
║                                                                           ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  Drag to move • Scroll to zoom • Click nodes for details    SQLite DB    ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

## Item Tracker Page Layout

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                     Tracked Upgrades & Quests                             ║
║                                                    [+ Add Tracked Item]   ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  ┌───────────────────────────────────────────────────────────────────┐  ║
║  │ ☑ Hideout Module Level 2                         [Requirements] [X]│  ║
║  │   upgrade • Completed: 2025-11-06                                  │  ║
║  └───────────────────────────────────────────────────────────────────┘  ║
║                                                                           ║
║  ┌───────────────────────────────────────────────────────────────────┐  ║
║  │ ☐ Complete Main Quest Chapter 3                  [Requirements] [X]│  ║
║  │   quest • Need to gather materials                                 │  ║
║  └───────────────────────────────────────────────────────────────────┘  ║
║                                                                           ║
║  ┌───────────────────────────────────────────────────────────────────┐  ║
║  │ ☐ Upgrade Weapon to Tier 5                       [Requirements] [X]│  ║
║  │   upgrade • Waiting for rare materials                             │  ║
║  └───────────────────────────────────────────────────────────────────┘  ║
║                                                                           ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                          Your Inventory                                   ║
║                                                                           ║
║  ┌────────────────────────────────────────────────────────────────────┐ ║
║  │ [Search items to add...                                          ▼] │ ║
║  └────────────────────────────────────────────────────────────────────┘ ║
║                                                                           ║
║  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐     ║
║  │ Iron             │  │ Steel            │  │ Fabric           │     ║
║  │ Material         │  │ Material         │  │ Material         │     ║
║  │ Quantity: [10]   │  │ Quantity: [5 ]   │  │ Quantity: [25]   │     ║
║  │              [×] │  │              [×] │  │              [×] │     ║
║  └──────────────────┘  └──────────────────┘  └──────────────────┘     ║
║                                                                           ║
║  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐     ║
║  │ Arc Alloy        │  │ Metal Parts      │  │ Electronics      │     ║
║  │ Material         │  │ Material         │  │ Material         │     ║
║  │ Quantity: [3 ]   │  │ Quantity: [15]   │  │ Quantity: [8 ]   │     ║
║  │              [×] │  │              [×] │  │              [×] │     ║
║  └──────────────────┘  └──────────────────┘  └──────────────────┘     ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

## Requirements Modal

```
╔═══════════════════════════════════════════════════════════════╗
║  Requirements: Upgrade Weapon to Tier 5               [×]    ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Add Required Items                                           ║
║  ┌─────────────────────────────────────────────────────┐     ║
║  │ Search items...                                   ▼ │     ║
║  └─────────────────────────────────────────────────────┘     ║
║                                                               ║
║  Required Items                                               ║
║  ┌─────────────────────────────────────────────────────┐     ║
║  │ ✓ Iron                                              │     ║
║  │   Need: 20 | Own: 25                      [Remove]  │     ║
║  └─────────────────────────────────────────────────────┘     ║
║                                                               ║
║  ┌─────────────────────────────────────────────────────┐     ║
║  │ ✗ Steel                                             │     ║
║  │   Need: 10 | Own: 5                       [Remove]  │     ║
║  └─────────────────────────────────────────────────────┘     ║
║                                                               ║
║  ┌─────────────────────────────────────────────────────┐     ║
║  │ ✗ Arc Alloy                                         │     ║
║  │   Need: 5 | Own: 3                        [Remove]  │     ║
║  └─────────────────────────────────────────────────────┘     ║
║                                                               ║
╠═══════════════════════════════════════════════════════════════╣
║                        [Close]                                ║
╚═══════════════════════════════════════════════════════════════╝
```

## Add Tracked Item Modal

```
╔═══════════════════════════════════════════════════════╗
║  Add Tracked Item                           [×]      ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║  Name *                                               ║
║  ┌─────────────────────────────────────────────┐     ║
║  │ e.g., Upgrade Hideout Module                │     ║
║  └─────────────────────────────────────────────┘     ║
║                                                       ║
║  Type                                                 ║
║  ┌─────────────────────────────────────────────┐     ║
║  │ Upgrade                                   ▼ │     ║
║  └─────────────────────────────────────────────┘     ║
║                                                       ║
║  Notes                                                ║
║  ┌─────────────────────────────────────────────┐     ║
║  │ Optional notes...                           │     ║
║  │                                             │     ║
║  │                                             │     ║
║  └─────────────────────────────────────────────┘     ║
║                                                       ║
╠═══════════════════════════════════════════════════════╣
║         [Add]                  [Cancel]               ║
╚═══════════════════════════════════════════════════════╝
```

## Delete Confirmation Modal

```
╔═══════════════════════════════════════════════════════╗
║  Confirm Deletion                           [×]      ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║  Are you sure you want to remove this tracked item?  ║
║  This action cannot be undone.                       ║
║                                                       ║
╠═══════════════════════════════════════════════════════╣
║       [Delete]                 [Cancel]               ║
╚═══════════════════════════════════════════════════════╝
```

## Error Toast Notification

```
┌─────────────────────────────────────────────┐
│ Failed to add item to inventory         [×] │
└─────────────────────────────────────────────┘
    (Auto-dismisses after 5 seconds)
```

## Visual States

### Completed Tracked Item
```
┌───────────────────────────────────────────────────────┐
│ ☑ Hideout Module Level 2                [Requirements]│
│   upgrade • Completed: 2025-11-06                  [X]│
└───────────────────────────────────────────────────────┘
  Green background, strikethrough text, checkmark
```

### Incomplete Tracked Item
```
┌───────────────────────────────────────────────────────┐
│ ☐ Upgrade Weapon to Tier 5             [Requirements]│
│   upgrade • Need to gather materials               [X]│
└───────────────────────────────────────────────────────┘
  White background, normal text
```

### Requirement Met
```
┌─────────────────────────────────────────────┐
│ ✓ Iron                            [Remove]  │
│   Need: 20 | Own: 25                        │
└─────────────────────────────────────────────┘
  Green background
```

### Requirement Not Met
```
┌─────────────────────────────────────────────┐
│ ✗ Steel                           [Remove]  │
│   Need: 10 | Own: 5                         │
└─────────────────────────────────────────────┘
  White background, red indicator
```

## Color Scheme

- **Primary Blue**: #3B82F6 (buttons, active tabs)
- **Success Green**: #10B981 (completed items, met requirements)
- **Error Red**: #EF4444 (delete buttons, unmet requirements)
- **Gray Background**: #F9FAFB (page background)
- **White**: #FFFFFF (cards, modals)
- **Text Gray**: #1F2937 (primary text)
- **Light Gray**: #6B7280 (secondary text)

## Interactive Elements

### Buttons
- Primary: Blue background, white text
- Secondary: Gray background, dark text
- Danger: Red background, white text
- All have hover states with darkened colors

### Inputs
- White background with gray border
- Blue focus ring on interaction
- Search dropdowns appear below input

### Checkboxes
- Large, easy to click
- Blue when checked
- Smooth animations

### Cards
- White background with shadow
- Rounded corners
- Hover effect on interactive cards
- Border color changes on hover
