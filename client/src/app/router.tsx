import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { RootLayout } from '@/app/root-layout';
import { Spinner } from '@/components/ui/spinner';
import { RequireAuth, RequireAdmin } from '@/features/auth/route-guards';

const HomePage = lazy(() => import('@/features/home/home-page'));
const ProductsPage = lazy(() => import('@/features/products/products-page'));
const ProductDetailPage = lazy(() => import('@/features/products/product-detail-page'));
const CategoriesPage = lazy(() => import('@/features/categories/categories-page'));
const DealsPage = lazy(() => import('@/features/deals/deals-page'));
const WishlistPage = lazy(() => import('@/features/wishlist/wishlist-page'));
const CartPage = lazy(() => import('@/features/cart/cart-page'));
const LoginPage = lazy(() => import('@/features/auth/login-page'));
const RegisterPage = lazy(() => import('@/features/auth/register-page'));
const CheckoutPage = lazy(() => import('@/features/checkout/checkout-page'));
const CheckoutSuccessPage = lazy(() => import('@/features/checkout/checkout-success-page'));
const CheckoutCancelPage = lazy(() => import('@/features/checkout/checkout-cancel-page'));
const AccountLayout = lazy(() => import('@/features/account/account-layout'));
const ProfilePage = lazy(() => import('@/features/account/profile-page'));
const OrdersPage = lazy(() => import('@/features/account/orders-page'));
const OrderDetailPage = lazy(() => import('@/features/account/order-detail-page'));
const AddressesPage = lazy(() => import('@/features/account/addresses-page'));

// TODO: Phase D - Admin dashboard (lazy imports)
const AdminLayout = lazy(() => import('@/features/admin/admin-layout'));
const AdminDashboardPage = lazy(() => import('@/features/admin/dashboard-page'));
const AdminProductsPage = lazy(() => import('@/features/admin/products-page'));
const AdminOrdersPage = lazy(() => import('@/features/admin/orders-page'));
const AdminCustomersPage = lazy(() => import('@/features/admin/customers-page'));
const AdminCouponsPage = lazy(() => import('@/features/admin/coupons-page'));
const AdminReviewsPage = lazy(() => import('@/features/admin/reviews-page'));

function PageLoader() {
  return (
    <div className="flex min-h-[40svh] items-center justify-center">
      <Spinner className="h-6 w-6" />
      <span className="sr-only">Loading page</span>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="flex min-h-[60svh] flex-col items-center justify-center gap-4 text-center px-4">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Page not found</h1>
        <p className="text-muted-foreground">The page you're looking for doesn't exist or has been moved.</p>
      </div>
      <a
        href="/"
        className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-accent-foreground transition-[filter] duration-200 ease-nova hover:brightness-110"
      >
        Go back home
      </a>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <NotFoundPage />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<PageLoader />}>
            <HomePage />
          </Suspense>
        ),
      },
      {
        path: 'products',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProductsPage />
          </Suspense>
        ),
      },
      {
        path: 'products/:slug',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProductDetailPage />
          </Suspense>
        ),
      },
      {
        path: 'categories',
        element: (
          <Suspense fallback={<PageLoader />}>
            <CategoriesPage />
          </Suspense>
        ),
      },
      {
        path: 'deals',
        element: (
          <Suspense fallback={<PageLoader />}>
            <DealsPage />
          </Suspense>
        ),
      },
      {
        path: 'wishlist',
        element: (
          <Suspense fallback={<PageLoader />}>
            <WishlistPage />
          </Suspense>
        ),
      },
      {
        path: 'cart',
        element: (
          <Suspense fallback={<PageLoader />}>
            <CartPage />
          </Suspense>
        ),
      },
      {
        path: 'login',
        element: (
          <Suspense fallback={<PageLoader />}>
            <LoginPage />
          </Suspense>
        ),
      },
      {
        path: 'register',
        element: (
          <Suspense fallback={<PageLoader />}>
            <RegisterPage />
          </Suspense>
        ),
      },
      {
        path: 'checkout',
        element: (
          <RequireAuth>
            <Suspense fallback={<PageLoader />}>
              <CheckoutPage />
            </Suspense>
          </RequireAuth>
        ),
      },
      {
        path: 'checkout/success',
        element: (
          <RequireAuth>
            <Suspense fallback={<PageLoader />}>
              <CheckoutSuccessPage />
            </Suspense>
          </RequireAuth>
        ),
      },
      {
        path: 'checkout/cancel',
        element: (
          <Suspense fallback={<PageLoader />}>
            <CheckoutCancelPage />
          </Suspense>
        ),
      },
      {
        path: 'account',
        element: (
          <RequireAuth>
            <Suspense fallback={<PageLoader />}>
              <AccountLayout />
            </Suspense>
          </RequireAuth>
        ),
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<PageLoader />}>
                <ProfilePage />
              </Suspense>
            ),
          },
          {
            path: 'orders',
            element: (
              <Suspense fallback={<PageLoader />}>
                <OrdersPage />
              </Suspense>
            ),
          },
          {
            path: 'orders/:id',
            element: (
              <Suspense fallback={<PageLoader />}>
                <OrderDetailPage />
              </Suspense>
            ),
          },
          {
            path: 'addresses',
            element: (
              <Suspense fallback={<PageLoader />}>
                <AddressesPage />
              </Suspense>
            ),
          },
        ],
      },
      {
        path: 'admin',
        element: (
          <RequireAdmin>
            <Suspense fallback={<PageLoader />}>
              <AdminLayout />
            </Suspense>
          </RequireAdmin>
        ),
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<PageLoader />}>
                <AdminDashboardPage />
              </Suspense>
            ),
          },
          {
            path: 'products',
            element: (
              <Suspense fallback={<PageLoader />}>
                <AdminProductsPage />
              </Suspense>
            ),
          },
          {
            path: 'orders',
            element: (
              <Suspense fallback={<PageLoader />}>
                <AdminOrdersPage />
              </Suspense>
            ),
          },
          {
            path: 'customers',
            element: (
              <Suspense fallback={<PageLoader />}>
                <AdminCustomersPage />
              </Suspense>
            ),
          },
          {
            path: 'coupons',
            element: (
              <Suspense fallback={<PageLoader />}>
                <AdminCouponsPage />
              </Suspense>
            ),
          },
          {
            path: 'reviews',
            element: (
              <Suspense fallback={<PageLoader />}>
                <AdminReviewsPage />
              </Suspense>
            ),
          },
        ],
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
