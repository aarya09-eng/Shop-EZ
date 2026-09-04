import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p className="font-medium text-foreground">ShopEZ — easy shopping, everyday value.</p>
        <nav className="flex flex-wrap gap-4">
          <Link to="/" className="hover:text-primary">
            Shop
          </Link>
          <Link to="/cart" className="hover:text-primary">
            Cart
          </Link>
          <Link to="/profile" className="hover:text-primary">
            My orders
          </Link>
          <Link to="/admin/login" className="hover:text-primary">
            Admin
          </Link>
        </nav>
        <p>&copy; {new Date().getFullYear()} ShopEZ</p>
      </div>
    </footer>
  );
}
