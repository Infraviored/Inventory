**Application Shell & Core Layout:**

*   **`src/components/layout.tsx`**:
    *   **Purpose**: Defines the overall page structure and layout for the application, potentially including headers, footers, and navigation.
    *   **URL Association**: Applies to all pages.
    *   **Verdict**: Core layout component.

*   **`src/components/providers.tsx`**:
    *   **Purpose**: Wraps the application with various context providers (e.g., theme, authentication, data fetching).
    *   **URL Association**: Applies to all pages (provides context).
    *   **Used By**: `src/app/layout.tsx` (implicitly, as it wraps the entire app).
    *   **Verdict**: Essential for app-wide state and functionality.

*   **`src/components/theme-provider.tsx`**:
    *   **Purpose**: Provides theme context to the application, likely for light/dark mode.
    *   **Used By**: `src/components/providers.tsx`
    *   **Verdict**: Essential for theming.

*   **`src/components/language-toggle.tsx`**:
    *   **Purpose**: Allows the user to switch the application's language.
    *   **Used By**: Likely part of `src/components/layout.tsx` or a global header.
    *   **Verdict**: UI utility.

*   **`src/components/theme-toggle.tsx`**:
    *   **Purpose**: Allows the user to toggle between light and dark themes.
    *   **Used By**: Likely part of `src/components/layout.tsx` or a global header.
    *   **Verdict**: UI utility for theme switching.

**Location Management (/locations, /locations/[id]):**

*   **`src/components/location-management.tsx`**:
    *   **Purpose**: Orchestrates the display of all locations and provides entry points to add new locations or edit/delete existing ones (using `LocationForm.tsx`).
    *   **URL Association**: `/locations` (via `src/app/locations/page.tsx`).
    *   **Used By**: `src/app/locations/page.tsx`.
    *   **Verdict**: Core for location CRUD.

*   **`src/components/location-form.tsx`**:
    *   **Purpose**: A comprehensive form for **creating a new location or editing an existing one**. This includes managing the location's metadata (name, description, type) and its image. Embeds `RegionMapper.tsx` to allow defining/editing regions.
    *   **URL Association**: Used for `/locations/new` (implicitly) and `/locations/[id]/edit` (implicitly), managed by `LocationManagement` or similar routing logic.
    *   **Used By**: `src/components/location-management.tsx`.
    *   **Verdict**: Core for location CRUD.

*   **`src/components/image-input.tsx`**:
    *   **Purpose**: A generic component for handling image uploads.
    *   **Used By**: `src/components/location-form.tsx`, `src/components/inventory-item-form.tsx`.
    *   **Verdict**: Utility component, likely fine as is.

**Inventory Item Management (/add-item, /items/[id], /inventory):**

*   **`src/components/inventory-item-form.tsx`**:
    *   **Purpose**: The form used on the `/add-item` page and `/items/[id]` (edit) page. This is where the main UX flow change (carousel -> region selection on image) will happen.
    *   **URL Association**: `/add-item` (via `src/app/add-item/page.tsx`), `/items/[id]` for editing (via `src/app/items/[id]/page.tsx`).
    *   **Currently Uses**: `LocationCarousel.tsx`, `RegionSelector.tsx`.
    *   **To Be Modified**: Will be refactored to orchestrate the new flow: show `LocationCarousel`, then if a location is picked, show `RegionMapper.tsx` in its new `selectionModeOnly`. The direct usage of `RegionSelector.tsx` will likely be removed.
    *   **Verdict**: Primary component for refactoring.

*   **`src/components/location-carousel.tsx`**:
    *   **Purpose**: Displays multiple locations in a carousel/slideshow format, allowing the user to browse and select a location.
    *   **Used By**: `src/components/inventory-item-form.tsx` (for the initial location selection step).
    *   **State**: Manages current index, list of locations.
    *   **Verdict**: Good for initial location browsing.

*   **`src/components/inventory-items.tsx`**:
    *   **Purpose**: Displays a list or grid of inventory items.
    *   **URL Association**: Likely `/inventory` (via `src/app/inventory/page.tsx`).
    *   **Verdict**: Core for displaying inventory.

**Region Mapping & Selection (Used across Location and Inventory features):**

*   **`src/components/region-mapper/RegionMapper.tsx`**:
    *   **Purpose**: The most comprehensive component for **creating, editing, and managing regions** on a location's image. It handles drawing new regions, moving, resizing, naming, duplicating, and deleting existing ones. It uses `RegionDisplay` for individual region rendering and `RegionList` for the textual list. It also manages the coordinate conversions between natural image coordinates and display coordinates.
    *   **Used By**:
        *   `src/components/location-form.tsx`
        *   Will be used by `src/components/inventory-item-form.tsx` in a new "selection-only" mode.
    *   **State**: Manages `activeRegions`, `imageSize`, selected region, interaction states (dragging, resizing, creating), UI states (popovers, forms), and settings (magnetism, colors).
    *   **Verdict**: Core for region editing and selection.

*   **`src/components/region-mapper/RegionDisplay.tsx`**:
    *   **Purpose**: Renders a *single* region overlay on an image. This includes the bounding box, the region's name, and (conditionally, based on props like `isSelectMode` or `isEditing`) action buttons like duplicate/delete and resize handles.
    *   **Used By**:
        *   `src/components/region-mapper/RegionMapper.tsx`
        *   `src/components/location-viewer.tsx`
    *   **State**: It's largely a presentational component, taking display coordinates and state (like `isSelected`) as props.
    *   **Verdict**: Essential, well-defined, reusable.

*   **`src/components/region-mapper/RegionForm.tsx`**:
    *   **Purpose**: Renders a form for editing the name and properties of a region.
    *   **Used By**: `src/components/region-mapper/RegionMapper.tsx`
    *   **Verdict**: Essential for region property editing.

*   **`src/components/region-mapper/RegionList.tsx`**:
    *   **Purpose**: Renders a list of region names. Allows selecting a region from the list and can display action buttons (edit/delete) for each region if not in a select-only mode.
    *   **Used By**:
        *   `src/components/region-mapper/RegionMapper.tsx`
        *   `src/components/region-selector.tsx`
    *   **State**: Manages which list item is visually selected, often in sync with a visual selection on an image.
    *   **Verdict**: Useful, reusable.

*   **`src/components/location-viewer.tsx`**:
    *   **Purpose**: **Displays a location's image and its defined regions** in a read-only fashion. It uses `RegionDisplay` for rendering regions and shares coordinate logic with `RegionMapper`. Does *not* allow drawing or modification.
    *   **URL Association**: Can be part of `/items/[id]` (for "Locate Item" dialog) or other views displaying location details.
    *   **Used By**:
        *   `src/app/items/[id]/page.tsx` (for the "Locate Item" dialog).
        *   `src/components/region-selector.tsx` (internally).
    *   **Verdict**: Essential for consistent read-only display.

*   **`src/components/region-selector.tsx`**:
    *   **Purpose**: Allows a user to **select one region from a list of pre-existing regions** associated with a *specific, already chosen* location. Uses `LocationViewer` (internally) to show the image and regions visually, and `RegionList` to provide a clickable list for selection.
    *   **Used By**: `src/components/inventory-item-form.tsx`.
    *   **Verdict**: Its role might be superseded by `RegionMapper`'s new selection mode for `InventoryItemForm`.

**Search Functionality:**

*   **`src/components/search-form.tsx`**:
    *   **Purpose**: Provides a user interface for searching within the application (e.g., searching inventory items or locations).
    *   **URL Association**: Could be on `/search` (via `src/app/search/page.tsx`) or embedded in other pages.
    *   **Verdict**: Core search functionality.

**UI Primitives (src/components/ui):**
*Generally, these are reusable, low-level UI building blocks often based on a UI library like Shadcn/ui. They do not map directly to URLs but are used by other components.*

*   **`src/components/ui/accordion.tsx`**: UI component for an accordion.
*   **`src/components/ui/alert-dialog.tsx`**: UI component for an alert dialog.
*   **`src/components/ui/alert.tsx`**: UI component for displaying alerts.
*   **`src/components/ui/aspect-ratio.tsx`**: UI component for maintaining aspect ratio of an element.
*   **`src/components/ui/avatar.tsx`**: UI component for displaying avatars.
*   **`src/components/ui/badge.tsx`**: UI component for displaying badges.
*   **`src/components/ui/breadcrumb.tsx`**: UI component for breadcrumb navigation.
*   **`src/components/ui/button.tsx`**: UI component for buttons.
*   **`src/components/ui/calendar.tsx`**: UI component for a calendar/date picker.
*   **`src/components/ui/card.tsx`**: UI component for displaying content in cards.
*   **`src/components/ui/carousel.tsx`**: UI component for a generic carousel.
*   **`src/components/ui/chart.tsx`**: UI component for displaying charts.
*   **`src/components/ui/checkbox.tsx`**: UI component for checkboxes.
*   **`src/components/ui/collapsible.tsx`**: UI component for collapsible sections.
*   **`src/components/ui/color-picker-popover.tsx`**: UI component for a color picker within a popover.
*   **`src/components/ui/color-picker.tsx`**: UI component for selecting colors.
*   **`src/components/ui/command.tsx`**: UI component for command palettes or menus.
*   **`src/components/ui/context-menu.tsx`**: UI component for context menus.
*   **`src/components/ui/dialog.tsx`**: UI component for dialogs/modals.
*   **`src/components/ui/drawer.tsx`**: UI component for drawers.
*   **`src/components/ui/dropdown-menu.tsx`**: UI component for dropdown menus.
*   **`src/components/ui/form.tsx`**: UI components and helpers for building forms.
*   **`src/components/ui/hover-card.tsx`**: UI component for cards that appear on hover.
*   **`src/components/ui/input-otp.tsx`**: UI component for one-time password input.
*   **`src/components/ui/input.tsx`**: UI component for text inputs.
*   **`src/components/ui/label.tsx`**: UI component for form labels.
*   **`src/components/ui/menubar.tsx`**: UI component for application menu bars.
*   **`src/components/ui/navigation-menu.tsx`**: UI component for navigation menus.
*   **`src/components/ui/pagination.tsx`**: UI component for pagination controls.
*   **`src/components/ui/popover.tsx`**: UI component for popovers.
*   **`src/components/ui/progress.tsx`**: UI component for progress bars.
*   **`src/components/ui/radio-group.tsx`**: UI component for radio button groups.
*   **`src/components/ui/resizable.tsx`**: UI component for creating resizable panels.
*   **`src/components/ui/scroll-area.tsx`**: UI component for scrollable areas.
*   **`src/components/ui/select.tsx`**: UI component for select dropdowns.
*   **`src/components/ui/separator.tsx`**: UI component for visual separators.
*   **`src/components/ui/sheet.tsx`**: UI component for sheets (side panels).
*   **`src/components/ui/sidebar.tsx`**: UI component for a sidebar.
*   **`src/components/ui/skeleton.tsx`**: UI component for displaying skeleton loaders.
*   **`src/components/ui/slider.tsx`**: UI component for sliders.
*   **`src/components/ui/sonner.tsx`**: UI component for toast notifications (Sonner).
*   **`src/components/ui/switch.tsx`**: UI component for toggle switches.
*   **`src/components/ui/table.tsx`**: UI components for displaying data in tables.
*   **`src/components/ui/tabs.tsx`**: UI component for tabbed navigation.
*   **`src/components/ui/textarea.tsx`**: UI component for multiline text areas.
*   **`src/components/ui/toast.tsx`**: UI component for individual toast notifications.
*   **`src/components/ui/toaster.tsx`**: UI component for managing and displaying toasts.
*   **`src/components/ui/toggle-group.tsx`**: UI component for groups of toggle buttons.
*   **`src/components/ui/toggle.tsx`**: UI component for a single toggle button.
*   **`src/components/ui/tooltip.tsx`**: UI component for tooltips.


```
.
├── ./app
│   ├── ./app/add-item
│   │   └── ./app/add-item/page.tsx
│   ├── ./app/api
│   │   ├── ./app/api/inventory
│   │   │   ├── ./app/api/inventory/[id]
│   │   │   │   └── ./app/api/inventory/[id]/route.ts
│   │   │   └── ./app/api/inventory/route.ts
│   │   ├── ./app/api/led
│   │   │   └── ./app/api/led/[id]
│   │   │       └── ./app/api/led/[id]/route.ts
│   │   ├── ./app/api/locations
│   │   │   ├── ./app/api/locations/[id]
│   │   │   │   ├── ./app/api/locations/[id]/breadcrumbs
│   │   │   │   │   └── ./app/api/locations/[id]/breadcrumbs/route.ts
│   │   │   │   ├── ./app/api/locations/[id]/regions
│   │   │   │   │   ├── ./app/api/locations/[id]/regions/[regionId]
│   │   │   │   │   │   └── ./app/api/locations/[id]/regions/[regionId]/route.ts
│   │   │   │   │   └── ./app/api/locations/[id]/regions/route.ts
│   │   │   │   └── ./app/api/locations/[id]/route.ts
│   │   │   └── ./app/api/locations/route.ts
│   │   ├── ./app/api/proxy
│   │   │   └── ./app/api/proxy/[...path]
│   │   └── ./app/api/search
│   │       └── ./app/api/search/route.ts
│   ├── ./app/favicon.ico
│   ├── ./app/globals.css
│   ├── ./app/inventory
│   │   ├── ./app/inventory/list
│   │   └── ./app/inventory/page.tsx
│   ├── ./app/items
│   │   └── ./app/items/[id]
│   │       └── ./app/items/[id]/page.tsx
│   ├── ./app/layout.tsx
│   ├── ./app/locations
│   │   └── ./app/locations/page.tsx
│   ├── ./app/page.tsx
│   └── ./app/search
│       └── ./app/search/page.tsx
├── ./components
│   ├── ./components/component_description.md
│   ├── ./components/image-input.tsx
│   ├── ./components/inventory-item-form.tsx
│   ├── ./components/inventory-items.tsx
│   ├── ./components/language-toggle.tsx
│   ├── ./components/layout.tsx
│   ├── ./components/location-carousel.tsx
│   ├── ./components/location-form.tsx
│   ├── ./components/location-management.tsx
│   ├── ./components/location-viewer.tsx
│   ├── ./components/providers.tsx
│   ├── ./components/region-mapper
│   │   ├── ./components/region-mapper/index.ts
│   │   ├── ./components/region-mapper/RegionDisplay.tsx
│   │   ├── ./components/region-mapper/RegionForm.tsx
│   │   ├── ./components/region-mapper/RegionList.tsx
│   │   ├── ./components/region-mapper/RegionMapper.tsx
│   │   ├── ./components/region-mapper/types.ts
│   │   └── ./components/region-mapper/utils.ts
│   ├── ./components/region-selector.tsx
│   ├── ./components/search-form.tsx
│   ├── ./components/theme-provider.tsx
│   ├── ./components/theme-toggle.tsx
│   └── ./components/ui
│       ├── ./components/ui/accordion.tsx
│       ├── ./components/ui/alert-dialog.tsx
│       ├── ./components/ui/alert.tsx
│       ├── ./components/ui/aspect-ratio.tsx
│       ├── ./components/ui/avatar.tsx
│       ├── ./components/ui/badge.tsx
│       ├── ./components/ui/breadcrumb.tsx
│       ├── ./components/ui/button.tsx
│       ├── ./components/ui/calendar.tsx
│       ├── ./components/ui/card.tsx
│       ├── ./components/ui/carousel.tsx
│       ├── ./components/ui/chart.tsx
│       ├── ./components/ui/checkbox.tsx
│       ├── ./components/ui/collapsible.tsx
│       ├── ./components/ui/color-picker-popover.tsx
│       ├── ./components/ui/color-picker.tsx
│       ├── ./components/ui/command.tsx
│       ├── ./components/ui/context-menu.tsx
│       ├── ./components/ui/dialog.tsx
│       ├── ./components/ui/drawer.tsx
│       ├── ./components/ui/dropdown-menu.tsx
│       ├── ./components/ui/form.tsx
│       ├── ./components/ui/hover-card.tsx
│       ├── ./components/ui/input-otp.tsx
│       ├── ./components/ui/input.tsx
│       ├── ./components/ui/label.tsx
│       ├── ./components/ui/menubar.tsx
│       ├── ./components/ui/navigation-menu.tsx
│       ├── ./components/ui/pagination.tsx
│       ├── ./components/ui/popover.tsx
│       ├── ./components/ui/progress.tsx
│       ├── ./components/ui/radio-group.tsx
│       ├── ./components/ui/resizable.tsx
│       ├── ./components/ui/scroll-area.tsx
│       ├── ./components/ui/select.tsx
│       ├── ./components/ui/separator.tsx
│       ├── ./components/ui/sheet.tsx
│       ├── ./components/ui/sidebar.tsx
│       ├── ./components/ui/skeleton.tsx
│       ├── ./components/ui/slider.tsx
│       ├── ./components/ui/sonner.tsx
│       ├── ./components/ui/switch.tsx
│       ├── ./components/ui/table.tsx
│       ├── ./components/ui/tabs.tsx
│       ├── ./components/ui/textarea.tsx
│       ├── ./components/ui/toaster.tsx
│       ├── ./components/ui/toast.tsx
│       ├── ./components/ui/toggle-group.tsx
│       ├── ./components/ui/toggle.tsx
│       └── ./components/ui/tooltip.tsx
├── ./hooks
│   ├── ./hooks/use-mobile.tsx
│   └── ./hooks/use-toast.ts
├── ./lib
│   ├── ./lib/api.ts
│   ├── ./lib/db.ts
│   ├── ./lib/language.tsx
│   └── ./lib/utils.ts
└── ./locales
    ├── ./locales/de.json
    └── ./locales/en.json
```