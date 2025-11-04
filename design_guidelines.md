# BkTravel Budget Manager - Design Guidelines

## Design Approach

**Reference-Based Approach**: Drawing inspiration from Airbnb (travel aesthetic, card layouts), Splitwise (expense splitting, playful functionality), and Notion (clean forms, organizational clarity). This creates a welcoming, travel-focused experience that balances playfulness with financial precision.

**Design Principles**:
- **Travel-First Visuals**: Evoke wanderlust and adventure through imagery while maintaining functional clarity
- **Playful Precision**: Friendly, approachable interface for serious budget tracking
- **Collaborative Focus**: Design emphasizes group dynamics and shared experiences
- **Mobile-Optimized**: Touch-friendly targets, thumb-zone navigation, responsive breakpoints

---

## Typography

**Font Families** (Google Fonts):
- **Primary**: 'Inter' - Clean, modern sans-serif for UI elements, forms, and data tables
- **Display**: 'Poppins' - Friendly, rounded sans-serif for headings, trip names, and CTAs

**Hierarchy**:
- **H1** (Trip Names, Page Titles): Poppins, 32px (mobile) / 48px (desktop), semibold (600)
- **H2** (Section Headers): Poppins, 24px (mobile) / 32px (desktop), semibold (600)
- **H3** (Card Titles, Budget Items): Poppins, 18px / 20px, medium (500)
- **Body Text**: Inter, 16px, regular (400), 1.6 line-height for readability
- **Small Text** (Labels, Metadata): Inter, 14px, medium (500)
- **Micro Text** (Timestamps, Helper): Inter, 12px, regular (400)

---

## Layout System

**Spacing Scale** (Tailwind Units):
- **Micro spacing**: 2 (0.5rem / 8px) - Icon gaps, tight groupings
- **Standard spacing**: 4 (1rem / 16px) - Form field gaps, card padding
- **Section spacing**: 6 (1.5rem / 24px) - Card internal sections, list item gaps
- **Component spacing**: 8 (2rem / 32px) - Between major UI blocks, card margins
- **Page margins**: 12 (3rem / 48px) on desktop, 4 on mobile - Edge breathing room

**Grid System**:
- **Container**: max-w-7xl (1280px) for main content, centered with mx-auto
- **Trip Cards Grid**: grid-cols-1 (mobile), md:grid-cols-2, lg:grid-cols-3 with gap-6
- **Form Layouts**: Single column on mobile (max-w-2xl), two-column splits on desktop for efficiency
- **Dashboard Tables**: Full-width with horizontal scroll on mobile, structured columns on desktop

---

## Component Library

### Navigation & Header
**Persistent Header** (Splash excluded):
- Full-width with subtle border-bottom, px-4 md:px-8, h-16
- Left: App logo (travel icon + "BkTravel" wordmark)
- Right: Google profile picture (rounded-full, w-10 h-10) with dropdown menu
- Mobile: Hamburger menu for navigation, profile always visible

### Splash Page
**Hero Section**:
- Full viewport height (min-h-screen) with background travel image (blurred overlay for text contrast)
- Center-aligned content: Logo (w-24 h-24), tagline (H1), CTA button
- Button on blurred background (backdrop-blur-md with semi-transparent background)
- Image: High-quality travel destination photo (mountains, beaches, or iconic landmarks)

### Cards (Trip Cards, Budget Item Cards)
**Structure**:
- Rounded corners (rounded-xl), shadow-md with hover:shadow-lg transition
- Padding: p-6 for desktop, p-4 for mobile
- Trip Cards: Image thumbnail at top (aspect-ratio-16/9, rounded-t-xl), content below with trip name (H3), member count, total budget summary
- Budget Item Cards: Icon left (w-12 h-12, rounded-full with subtle background), title + amount right-aligned, member avatars below

### Forms (Budget Creation)
**Layout**:
- Vertical flow with clear section breaks (border-t with pt-6 between major sections)
- Input fields: Full-width with h-12, rounded-lg, border focus states
- Labels: Above inputs (mb-2), semibold, 14px
- Dynamic member inputs: Each in a card with remove button (X icon, top-right)
- Budget item rows: Grid layout with 3 columns on desktop (item name, amount, member checkboxes), stacked on mobile

**Member Selection**:
- Checkbox grid: 2-3 columns on mobile, 4-5 on desktop
- Each member: Avatar placeholder (initials in circle) + name label beneath
- Selected state: Distinct visual treatment (checkmark overlay, border highlight)

### Dashboard
**History Table**:
- Alternating row backgrounds for readability
- Columns: Date (sorted), Item Name, Amount, Split Members (avatars), Actions (edit/delete icons)
- Mobile: Card-based layout stacking information vertically per item

**Visualizations**:
- Pie chart (expense categories) and bar chart (member spending) side-by-side on desktop, stacked on mobile
- Charts container: bg-white, rounded-xl, p-6, shadow-sm
- Use Chart.js or Recharts library via CDN

**Notifications**:
- Toast-style notifications (top-right, fixed positioning)
- Slide-in animation, auto-dismiss after 4 seconds
- Structure: Icon (checkmark), text ("Budget Added: Tea, Amount: $15"), close button

### Buttons
**Primary CTA** (Create Budget, Save, Login):
- Rounded-full, px-8, py-3 (h-12), semibold text
- Shadow-md with hover:shadow-lg, transform hover:-translate-y-0.5 transition

**Secondary** (Back, Cancel):
- Rounded-lg, px-6, py-2.5, border-2 with transparent background
- Hover: Subtle background fill

**Icon Buttons** (Add More, Delete, Edit):
- Circular (w-10 h-10), centered icon, subtle hover background

### Icons
**Library**: Heroicons (via CDN)
- Navigation: home, chart-bar, user-circle, plus-circle
- Actions: pencil, trash, check, x-mark
- Budget items: currency-dollar, shopping-bag, home, truck
- Consistent size: w-5 h-5 for inline, w-6 h-6 for standalone

---

## Images

**Splash Page Hero**: 
- Full-width, full-height background image of inspiring travel destination (tropical beach, mountain vista, or European cityscape)
- Subtle gradient overlay from bottom to ensure text readability

**Trip Card Thumbnails**: 
- 16:9 aspect ratio placeholder images representing travel themes (beaches, cities, mountains)
- Rounded top corners (rounded-t-xl)

**Profile Pictures**: 
- Google profile photos (circular, various sizes: w-10 h-10 in header, w-16 h-16 in profile section)

**Member Avatars**: 
- Initials-based circular avatars when no image (w-8 h-8 in lists, w-12 h-12 in selection)

---

## Accessibility & Interactions

- All interactive elements minimum 44px touch target
- Form inputs with clear focus states (ring-2 with offset)
- Error states: Red border + error message below input (text-red-600, text-sm)
- Success states: Green checkmark icon + confirmation message
- Loading states: Spinner overlays for async operations
- Keyboard navigation: Tab order follows visual hierarchy

---

## Responsive Breakpoints

- **Mobile-first**: Base styles for 375px+
- **Tablet** (md): 768px - Two-column grids, expanded navigation
- **Desktop** (lg): 1024px - Three-column grids, side-by-side layouts
- **Wide** (xl): 1280px - Maximum container width, optimal spacing