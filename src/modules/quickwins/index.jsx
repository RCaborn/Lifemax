import Widget from './Widget.jsx'

// Widget-only module: lives on the HQ, has no bento card of its own.
export default {
  id: 'quickwins',
  name: 'Quick Wins',
  icon: 'Zap',
  color: '#ffffff',
  tagline: 'Small daily habits, instant XP',
  removable: true,
  section: false,
  widgetSlot: 1,
  Widget,
}
