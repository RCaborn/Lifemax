import {
  Beer, Pizza, Gamepad2, BedDouble, Cookie, Clapperboard, ShoppingBag, Coffee,
  PartyPopper, Cigarette, Beef, Palmtree, Moon, Headphones, Donut, Dices,
  Flower2, Footprints, BookOpen, Calculator, Languages, Waves, Flag, Brush,
  Gift, Rocket, Zap, Dumbbell, Brain, Heart, Smile, Star, Droplet, Sun, Music,
  Wallet, TrendingUp, LayoutDashboard, CalendarDays, NotebookPen, Target,
  Gauge, AlarmClock, Timer, GraduationCap, Sparkles, TriangleAlert,
  Trophy, Skull, Banknote, Smartphone, Cloud, Mail, RefreshCw, Activity, CircleCheck,
  Briefcase, Lightbulb, Store, Globe, Code, Megaphone, Package, Coins, Camera,
  Palette, Laptop, Gem, Building2, ShoppingCart, Feather,
} from 'lucide-react'

// Icon names usable anywhere an "icon" is stored as data: quick wins, vices,
// toast icons, earn-ledger icons, nav/domain icons. Legacy items may still
// hold a literal emoji string — ItemIcon falls back to rendering that string
// directly so existing data keeps showing something.
export const ICONS = {
  Beer, Pizza, Gamepad2, BedDouble, Cookie, Clapperboard, ShoppingBag, Coffee,
  PartyPopper, Cigarette, Beef, Palmtree, Moon, Headphones, Donut, Dices,
  Flower2, Footprints, BookOpen, Calculator, Languages, Waves, Flag, Brush,
  Gift, Rocket, Zap, Dumbbell, Brain, Heart, Smile, Star, Droplet, Sun, Music,
  Wallet, TrendingUp, LayoutDashboard, CalendarDays, NotebookPen, Target,
  Gauge, AlarmClock, Timer, GraduationCap, Sparkles, TriangleAlert,
  Trophy, Skull, Banknote, Smartphone, Cloud, Mail, RefreshCw, Activity, CircleCheck,
  Briefcase, Lightbulb, Store, Globe, Code, Megaphone, Package, Coins, Camera,
  Palette, Laptop, Gem, Building2, ShoppingCart, Feather,
}

export const VICE_ICONS = [
  'Beer', 'Pizza', 'Gamepad2', 'BedDouble', 'Cookie', 'Clapperboard', 'ShoppingBag', 'Coffee',
  'PartyPopper', 'Cigarette', 'Beef', 'Palmtree', 'Moon', 'Headphones', 'Donut', 'Dices',
]

export const QUICKWIN_ICONS = [
  'Zap', 'Footprints', 'Flower2', 'BookOpen', 'Dumbbell', 'Brush', 'Calculator', 'Languages',
  'Waves', 'Flag', 'Coffee', 'Sun', 'Music', 'Brain', 'Heart', 'Star',
]

export const PROJECT_ICONS = [
  'Rocket', 'Lightbulb', 'Store', 'Globe', 'Code', 'Megaphone', 'Package', 'Coins',
  'Camera', 'Palette', 'Laptop', 'Gem', 'Briefcase', 'Building2', 'TrendingUp', 'ShoppingCart',
]

export function ItemIcon({ icon, size = 16, className }) {
  const Cmp = ICONS[icon]
  if (Cmp) return <Cmp size={size} className={className} />
  if (!icon) return null
  return <span className={className}>{icon}</span>
}

export function IconPicker({ icons, value, onChange }) {
  return (
    <div className="grid grid-cols-8 gap-1.5">
      {icons.map((name) => {
        const Cmp = ICONS[name]
        const active = value === name
        return (
          <button key={name} type="button" onClick={() => onChange(name)} title={name}
            className="grid h-8 w-8 place-items-center rounded-lg border transition"
            style={{
              borderColor: active ? '#fff' : 'rgba(255,255,255,.08)',
              background: active ? '#fff' : 'rgba(255,255,255,.04)',
              color: active ? '#000' : '#888',
            }}>
            <Cmp size={15} />
          </button>
        )
      })}
    </div>
  )
}
