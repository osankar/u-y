// Placeholder — delete when the real home page is built
export default function Home() {
  return (
    <div
      style={{
        maxWidth: '820px',
        margin: '60px auto',
        padding: '0 24px',
      }}
    >
      <h1
        style={{
          fontFamily: 'var(--font-display), Georgia, serif',
          fontSize: '38px',
          fontWeight: 500,
          color: 'var(--text)',
          letterSpacing: '-0.02em',
          lineHeight: 1.08,
          marginBottom: '16px',
        }}
      >
        Vendors who actually know your wedding, your puja, your baby shower.
      </h1>

      <p
        style={{
          fontFamily: 'var(--font-sans), system-ui, sans-serif',
          fontSize: '16px',
          color: 'var(--text-muted)',
          lineHeight: 1.55,
          marginBottom: '32px',
        }}
      >
        Utsav Yojana is a directory of Indian event vendors for the US-based Indian diaspora.
      </p>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '32px',
          color: 'var(--text-subtle)',
          fontSize: '12.5px',
        }}
      >
        <i className="ti ti-calendar-event" style={{ fontSize: '16px', color: 'var(--accent)' }} />
        <span>Find vendors for sangeet, mehndi, puja, and more</span>
      </div>

      <div
        style={{
          background: 'var(--surface)',
          border: '0.5px solid var(--border)',
          borderRadius: '12px',
          padding: '20px',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-display), Georgia, serif',
            fontSize: '14.5px',
            fontWeight: 500,
            color: 'var(--text)',
            marginBottom: '6px',
          }}
        >
          Design system check
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
          Background <code style={{ color: 'var(--accent)' }}>var(--bg)</code> = #FAF7F2 ·{' '}
          Accent <code style={{ color: 'var(--accent)' }}>var(--accent)</code> = #C75D2C ·{' '}
          Fonts: Fraunces + Inter
        </p>
      </div>
    </div>
  )
}
