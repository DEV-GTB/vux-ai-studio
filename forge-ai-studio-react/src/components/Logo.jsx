import { useId } from 'react'

export function Logo({ className = 'h-8 w-8', title = 'VUX AI' }) {
  return (
    <img
      src="/vux-logo.png"
      alt={title}
      className={className}
      style={{
        objectFit: 'contain',
        borderRadius: '12px',
        background: 'transparent',
      }}
      loading="lazy"
    />
  )
}

export default Logo