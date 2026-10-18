import { Container } from '@/components/layout/container';
import { Github, Instagram, Mail, Twitter } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <Container>
        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <Link to="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-foreground">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-black text-accent-foreground"
                aria-hidden
              >
                N
              </span>
              ShopNova
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              Premium tech, audio, and accessories — curated, tested, and shipped fast across Bangladesh.
            </p>
            <div className="flex gap-1">
              {[
                { icon: Twitter, label: 'Twitter' },
                { icon: Instagram, label: 'Instagram' },
                { icon: Github, label: 'GitHub' },
                { icon: Mail, label: 'Email' },
              ].map(({ icon: Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors duration-200 ease-nova hover:bg-accent/10 hover:text-accent"
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </a>
              ))}
            </div>
          </div>

          <FooterCol
            title="Shop"
            links={[
              { to: '/products', label: 'All products' },
              { to: '/categories', label: 'Categories' },
              { to: '/deals', label: 'Deals' },
              { to: '/wishlist', label: 'Wishlist' },
            ]}
          />
          <FooterCol
            title="Account"
            links={[
              { to: '/account', label: 'My account' },
              { to: '/account/orders', label: 'Orders' },
              { to: '/account/addresses', label: 'Addresses' },
              { to: '/cart', label: 'Cart' },
            ]}
          />
          <FooterCol
            title="Company"
            links={[
              { to: '/', label: 'About us' },
              { to: '/', label: 'Privacy policy' },
              { to: '/', label: 'Terms of service' },
              { to: '/', label: 'Shipping & returns' },
            ]}
          />
        </div>

        <div className="flex flex-col items-center justify-between gap-2 border-t border-border py-5 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} ShopNova. All rights reserved.</p>
          <p>
            Built with the MERN stack · <span className="font-medium">Demo store</span>
          </p>
        </div>
      </Container>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: Array<{ to: string; label: string }> }) {
  return (
    <nav aria-label={title}>
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              to={link.to}
              className="text-sm text-muted-foreground transition-colors duration-200 ease-nova hover:text-accent"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
