// Simple inline SVG icons (no icon library). They take the text colour unless a colour is given.

import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Svg({ size = 20, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}

/** The brand arrow: a bold, solid arrow. Used sparingly on primary buttons, headings and the home hero. */
export function Arrow({ size = 20, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...rest}>
      <path d="M2 9.5h12V4l9 8-9 8v-5.5H2z" fill="currentColor" />
    </svg>
  )
}

export const ArrowLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Svg>
)

export const Check = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
)

export const Close = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
)

export const MenuIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Svg>
)

export const Alert = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3l10 18H2z" />
    <path d="M12 10v4M12 17.5v.01" />
  </Svg>
)

export const Info = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M12 11v6M12 7.5v.01" />
  </Svg>
)

export const MapIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 4L3 6.5v13.5L9 17.5l6 2.5 6-2.5V4l-6 2.5z" />
    <path d="M9 4v13.5M15 6.5V20" />
  </Svg>
)

export const Clipboard = (p: IconProps) => (
  <Svg {...p}>
    <rect x="5" y="4" width="14" height="17" rx="2" />
    <path d="M9 4V3h6v1M9 11h6M9 15h4" />
  </Svg>
)

export const Book = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 6.5C10 5 7 4.5 3 5v13.5c4-.5 7 0 9 1.5 2-1.5 5-2 9-1.5V5c-4-.5-7 0-9 1.5z" />
    <path d="M12 6.5V20" />
  </Svg>
)

export const Inbox = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 13l3-8h12l3 8v6H3z" />
    <path d="M3 13h5l1.5 2.5h5L16 13h5" />
  </Svg>
)

export const Truck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2 6h12v10H2zM14 9h4l4 4v3h-8" />
    <circle cx="6.5" cy="17.5" r="1.8" />
    <circle cx="17.5" cy="17.5" r="1.8" />
  </Svg>
)

export const Laptop = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="5" width="16" height="11" rx="1.5" />
    <path d="M2 19h20" />
  </Svg>
)

export const Printer = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 9V3h10v6M7 17H4v-7h16v7h-3" />
    <rect x="7" y="14" width="10" height="7" />
  </Svg>
)

export const Download = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3v12M7 10l5 5 5-5M4 20h16" />
  </Svg>
)

export const QrIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="6" height="6" />
    <rect x="14.5" y="3.5" width="6" height="6" />
    <rect x="3.5" y="14.5" width="6" height="6" />
    <path d="M14.5 14.5h2v2h-2zM18.5 18.5h2v2h-2zM14.5 20.5v-2M20.5 14.5h-2" />
  </Svg>
)
