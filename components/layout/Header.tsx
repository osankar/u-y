import Link from 'next/link'

export default function Header() {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: 'rgba(250, 247, 242, 0.9)',
        backdropFilter: 'blur(8px)',
        borderBottom: '0.5px solid var(--border)',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 24px',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link href="/" style={{ textDecoration: 'none', lineHeight: 1 }}>
          <div
            style={{
              fontFamily: 'var(--font-display), Georgia, serif',
              fontSize: '18px',
              fontWeight: 500,
              color: 'var(--text)',
              letterSpacing: '-0.01em',
            }}
          >
            Utsav Yojana
          </div>
          <div
            style={{
              fontFamily: 'var(--font-sans), system-ui, sans-serif',
              fontSize: '10px',
              color: 'var(--text-subtle)',
              letterSpacing: '0.01em',
              marginTop: '1px',
            }}
          >
            उत्सव योजना
          </div>
        </Link>

        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Link
            href="/vendors"
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--text-muted)',
              textDecoration: 'none',
              padding: '6px 12px',
            }}
            className="nav-link-hidden"
          >
            Find vendors
          </Link>
          <Link
            href="/planner"
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--text-muted)',
              textDecoration: 'none',
              padding: '6px 12px',
            }}
            className="nav-link-hidden"
          >
            Planner
          </Link>
          <Link
            href="/for-providers"
            style={{
              fontSize: '12.5px',
              fontWeight: 500,
              color: 'var(--text)',
              textDecoration: 'none',
              padding: '9px 18px',
              border: '1px solid var(--text)',
              borderRadius: '999px',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            List your business
          </Link>
        </nav>
      </div>
    </header>
  )
}
