import Link from 'next/link'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer
      style={{
        borderTop: '0.5px solid var(--border)',
        marginTop: '80px',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '32px 24px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '24px',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'Fraunces, Georgia, serif',
              fontSize: '16px',
              fontWeight: 500,
              color: 'var(--text)',
            }}
          >
            Utsav Yojana
          </div>
          <div
            style={{
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: '10px',
              color: 'var(--text-subtle)',
              marginTop: '2px',
            }}
          >
            उत्सव योजना
          </div>
          <p
            style={{
              fontSize: '12px',
              color: 'var(--text-subtle)',
              marginTop: '12px',
            }}
          >
            © {year} Utsav Yojana
          </p>
        </div>

        <nav
          style={{
            display: 'flex',
            gap: '24px',
            flexWrap: 'wrap',
          }}
        >
          {[
            { href: '/for-providers', label: 'For providers' },
            { href: '/about', label: 'About' },
            { href: '/privacy', label: 'Privacy' },
            { href: '/terms', label: 'Terms' },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={{
                fontSize: '13px',
                color: 'var(--text-muted)',
                textDecoration: 'none',
              }}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
