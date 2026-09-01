import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import { useWishlistStore } from '@/store/wishlistStore'
import { StoreLayout } from '@/components/layout/StoreLayout'
import { AccountLayout } from '@/pages/account/AccountLayout'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { ProtectedRoute, AdminRoute } from '@/components/routes/Guards'
import { Privacy, Terms, Shipping, Refund } from '@/pages/policies'

import Home from '@/pages/Home'
import Products from '@/pages/Products'
import ProductDetail from '@/pages/ProductDetail'
import Categories from '@/pages/Categories'
import CategoryProducts from '@/pages/CategoryProducts'
import Search from '@/pages/Search'
import Deals from '@/pages/Deals'
import About from '@/pages/About'
import Contact from '@/pages/Contact'
import Cart from '@/pages/Cart'
import Checkout from '@/pages/Checkout'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import ForgotPassword from '@/pages/ForgotPassword'
import TrackOrder from '@/pages/TrackOrder'
import NotFound from '@/pages/NotFound'
import AccountDashboard from '@/pages/account/AccountDashboard'
import Orders from '@/pages/account/Orders'
import OrderDetail from '@/pages/account/OrderDetail'
import Wishlist from '@/pages/account/Wishlist'
import Addresses from '@/pages/account/Addresses'
import Profile from '@/pages/account/Profile'
import AdminLogin from '@/pages/admin/AdminLogin'
import Dashboard from '@/pages/admin/Dashboard'
import AdminProducts from '@/pages/admin/AdminProducts'
import ProductForm from '@/pages/admin/ProductForm'
import AdminCategories from '@/pages/admin/AdminCategories'
import AdminBrands from '@/pages/admin/AdminBrands'
import AdminInventory from '@/pages/admin/AdminInventory'
import AdminOrders from '@/pages/admin/AdminOrders'
import AdminOrderDetail from '@/pages/admin/AdminOrderDetail'
import AdminCustomers from '@/pages/admin/AdminCustomers'
import AdminReviews from '@/pages/admin/AdminReviews'
import AdminCoupons from '@/pages/admin/AdminCoupons'
import AdminBanners from '@/pages/admin/AdminBanners'
import AdminAnalytics from '@/pages/admin/AdminAnalytics'
import AdminSettings from '@/pages/admin/AdminSettings'

export default function App() {
  const init = useAuthStore((s) => s.init)
  const user = useAuthStore((s) => s.user)
  const bindCart = useCartStore((s) => s.bindUser)
  const unbindCart = useCartStore((s) => s.unbindUser)
  const loadWishlist = useWishlistStore((s) => s.load)
  const clearWishlist = useWishlistStore((s) => s.clear)

  useEffect(() => {
    let cleanup: (() => void) | undefined
    init().then((fn) => { cleanup = fn })
    return () => cleanup?.()
  }, [])

  useEffect(() => {
    if (user) { bindCart(user.id); loadWishlist(user.id) }
    else { clearWishlist() }
  }, [user?.id])

  return (
    <Routes>
      {/* Storefront */}
      <Route element={<StoreLayout />}>
        <Route index element={<Home />} />
        <Route path="products" element={<Products />} />
        <Route path="products/:slug" element={<ProductDetail />} />
        <Route path="categories" element={<Categories />} />
        <Route path="category/:slug" element={<CategoryProducts />} />
        <Route path="search" element={<Search />} />
        <Route path="deals" element={<Deals />} />
        <Route path="about" element={<About />} />
        <Route path="contact" element={<Contact />} />
        <Route path="cart" element={<Cart />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="track-order" element={<TrackOrder />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="terms" element={<Terms />} />
        <Route path="shipping" element={<Shipping />} />
        <Route path="refund" element={<Refund />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="forgot-password" element={<ForgotPassword />} />

        {/* Account */}
        <Route path="account" element={<ProtectedRoute><AccountLayout /></ProtectedRoute>}>
          <Route index element={<AccountDashboard />} />
          <Route path="profile" element={<Profile />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="wishlist" element={<Wishlist />} />
          <Route path="addresses" element={<Addresses />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Admin */}
      <Route path="admin/login" element={<AdminLogin />} />
      <Route path="admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="products/new" element={<ProductForm />} />
        <Route path="products/:id/edit" element={<ProductForm />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="brands" element={<AdminBrands />} />
        <Route path="inventory" element={<AdminInventory />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="orders/:id" element={<AdminOrderDetail />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="reviews" element={<AdminReviews />} />
        <Route path="coupons" element={<AdminCoupons />} />
        <Route path="banners" element={<AdminBanners />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>
    </Routes>
  )
}
