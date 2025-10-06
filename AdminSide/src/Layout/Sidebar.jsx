"use client"

import { Link, useLocation } from "react-router-dom"
import { useState, useEffect } from "react"
import { LayoutDashboard, Package, TrendingUp, Users, LogOut, Newspaper, ClipboardList, ChevronDown, ChevronRight, EarIcon, Boxes, Store, MessageCircle } from "lucide-react"
import { signOut } from "firebase/auth"
import { auth } from "../firebase/config"

const Sidebar = () => {
   const location = useLocation()
   const [showLogoutModal, setShowLogoutModal] = useState(false)
   const [isProductsOpen, setIsProductsOpen] = useState(false)

   const menuItems = [
      { path: "/", icon: LayoutDashboard, label: "Dashboard" },
      { path: "/news", icon: Newspaper, label: "Drops" },
      { path: '/orders', icon: ClipboardList, label: 'Orders' },
      { path: '/products', icon: Package, label: 'Products' },
      { path: "/sales", icon: TrendingUp, label: "Sales Analytics" },
      { path: "/customers", icon: Users, label: "Customers" },
      { path: "/feedback", icon: EarIcon, label: "Feedback" },
      { path: "/messages", icon: MessageCircle, label: "Messages" },
   ]

   const productSubItems = [
      { path: "/products", label: "Product Management", icon: Boxes },
      { path: "/products/solds", label: "Sold Products", icon: Store }
   ]

   useEffect(() => {
      if (location.pathname.startsWith("/products")) {
         setIsProductsOpen(true)
      }
   }, [location.pathname])

   const handleLogout = async () => {
      try {
         await signOut(auth)
         setShowLogoutModal(false)
      } catch (error) {
         console.error("Error signing out:", error)
      }
   }

   const openLogoutModal = () => setShowLogoutModal(true)
   const closeLogoutModal = () => setShowLogoutModal(false)

   return (
      <>
         <div className="w-full max-w-[240px] lg:max-w-[300px] bg-[#135918] flex flex-col min-h-screen border-r border-slate-800">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-slate-800">
               <div className="flex items-center space-x-3">
                  <div className="relative flex-shrink-0">
                     <img 
                        src="/logo.png" 
                        alt="Upcycled Streetwear Logo" 
                        className="h-10 w-10 sm:h-12 sm:w-12 object-contain p-1 mt-3" 
                     />
                  </div>
                  <div className="min-w-0 flex-1">
                     <h1 className="text-base sm:text-lg font-bold text-white truncate">Upcycled Streetwear</h1>
                     <p className="text-slate-400 text-xs sm:text-sm truncate">Admin Portal</p>
                  </div>
               </div>
            </div>

            {/* User Info */}
            <div className="p-4 sm:p-6 border-b border-slate-800">
               <div className="flex items-center space-x-3">
                  <div className="flex-1 min-w-0">
                     <p className="text-sm font-medium text-white truncate">Administrator</p>
                     <p className="text-xs text-slate-400 truncate">admin@upcycled.com</p>
                  </div>
               </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 sm:px-4 py-4 sm:py-6 overflow-y-auto scrollbar-hide">
               <div className="mb-6">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-3">
                     Main Menu
                  </p>
                  <div className="space-y-1">
                     {/* Dashboard + News */}
                     {menuItems.slice(0, 2).map((item) => {
                        const Icon = item.icon
                        const isActive = location.pathname === item.path
                        return (
                           <Link
                              key={item.path}
                              to={item.path}
                              className={`group relative flex items-center space-x-2 sm:space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                                 isActive 
                                    ? "bg-[#113A14] text-white shadow-lg" 
                                    : "text-slate-300 hover:text-white hover:bg-[#A8C3A0]"
                              }`}
                           >
                              {isActive && (
                                 <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#A8C3A0] rounded-r-full"></div>
                              )}
                              <Icon className={`h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 ${isActive ? "text-white" : "text-slate-400 group-hover:text-white"} transition-colors`} />
                              <span className="font-medium text-sm sm:text-base truncate">{item.label}</span>
                           </Link>
                        )
                     })}

                     {/* Orders */}
                     {(() => {
                        const item = menuItems[2]
                        const isActive = location.pathname === item.path
                        const Icon = item.icon
                        return (
                           <Link
                              key={item.path}
                              to={item.path}
                              className={`group relative flex items-center space-x-2 sm:space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                                 isActive 
                                    ? "bg-[#113A14] text-white shadow-lg" 
                                    : "text-slate-300 hover:text-white hover:bg-[#A8C3A0]"
                              }`}
                           >
                              {isActive && (
                                 <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#A8C3A0] rounded-r-full"></div>
                              )}
                              <Icon className={`h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 ${isActive ? "text-white" : "text-slate-400 group-hover:text-white"} transition-colors`} />
                              <span className="font-medium text-sm sm:text-base truncate">{item.label}</span>
                           </Link>
                        )
                     })()}

                     {/* Products Dropdown */}
                     <button
                        onClick={() => setIsProductsOpen(!isProductsOpen)}
                        className={`group w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 ${
                           location.pathname.startsWith("/products")
                              ? "bg-[#113A14] text-white shadow-lg"
                              : "text-slate-300 hover:text-white hover:bg-[#A8C3A0]"
                        }`}
                     >
                        <div className="flex items-center space-x-2">
                           <Package className={`h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 ${location.pathname.startsWith("/products") ? "text-white" : "text-slate-400 group-hover:text-white"} transition-colors`} />
                           <span className="font-medium text-sm sm:text-base">Products</span>
                        </div>
                        {isProductsOpen ? (
                           <ChevronDown className="h-4 w-4" />
                        ) : (
                           <ChevronRight className="h-4 w-4" />
                        )}
                     </button>

                     {isProductsOpen && (
                        <div className="ml-8 mt-1 space-y-1">
                           {productSubItems.map((sub) => {
                              const Icon = sub.icon
                              const isActive = location.pathname === sub.path
                              return (
                                 <Link
                                    key={sub.path}
                                    to={sub.path}
                                    className={`group relative flex items-center space-x-2 sm:space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                                       isActive
                                          ? "bg-[#113A14] text-white shadow-md"
                                          : "text-slate-300 hover:text-white hover:bg-[#A8C3A0]"
                                    }`}
                                 >
                                    {isActive && (
                                       <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#A8C3A0] rounded-r-full"></div>
                                    )}
                                    <Icon className={`h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 ${isActive ? "text-white" : "text-slate-400 group-hover:text-white"} transition-colors`} />
                                    <span className="font-medium text-sm sm:text-base truncate">{sub.label}</span>
                                 </Link>
                              )
                           })}
                        </div>
                     )}

                     {/* Sales + Customers + Feedback */}
                     {menuItems.slice(4).map((item) => {
                        const Icon = item.icon
                        const isActive = location.pathname === item.path
                        return (
                           <Link
                              key={item.path}
                              to={item.path}
                              className={`group relative flex items-center space-x-2 sm:space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                                 isActive 
                                    ? "bg-[#113A14] text-white shadow-lg" 
                                    : "text-slate-300 hover:text-white hover:bg-[#A8C3A0]"
                              }`}
                           >
                              {isActive && (
                                 <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#A8C3A0] rounded-r-full"></div>
                              )}
                              <Icon className={`h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 ${isActive ? "text-white" : "text-slate-400 group-hover:text-white"} transition-colors`} />
                              <span className="font-medium text-sm sm:text-base truncate">{item.label}</span>
                           </Link>
                        )
                     })}
                  </div>
               </div>
            </nav>

            {/* Footer */}
            <div className="border-t border-slate-800 p-3 sm:p-4">
               <button
                  onClick={openLogoutModal}
                  className="group flex items-center space-x-2 sm:space-x-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 w-full"
               >
                  <LogOut className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-slate-400 group-hover:text-red-400 transition-colors" />
                  <span className="font-medium text-sm sm:text-base truncate">Sign Out</span>
               </button>
            </div>
         </div>

         {/* Logout Confirmation Modal */}
            {showLogoutModal && (
               <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
                  <div className="bg-gradient-to-br from-green-700 to-emerald-800 p-8 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] w-full max-w-sm mx-4 text-center border border-green-500 animate-bounce-in">
                        <div className="flex justify-center mb-4">
                           <svg
                              className="h-12 w-12 text-white opacity-90"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                           >
                              <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H5a3 3 0 01-3-3V7a3 3 0 013-3h5a3 3 0 013 3v1"
                              />
                           </svg>
                        </div>
                        <h3 className="text-2xl font-extrabold text-white mb-2 tracking-wide">Confirm Sign Out</h3>
                        <p className="text-green-200 mb-8 font-light">Are you sure you want to log out of your account?</p>
                        <div className="flex justify-center space-x-4">
                           <button
                              onClick={closeLogoutModal}
                              className="bg-gray-800 text-white font-semibold px-6 py-3 rounded-xl hover:bg-gray-700 transition-all duration-300 transform hover:scale-105 shadow-md border border-transparent hover:border-gray-500"
                           >
                              Cancel
                           </button>
                           <button
                              onClick={handleLogout}
                              className="bg-red-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-red-500 transition-all duration-300 transform hover:scale-105 shadow-md"
                           >
                              Sign Out
                           </button>
                        </div>
                  </div>
               </div>
            )}

         {/* Hide scrollbar with fallback if Tailwind plugin not installed */}
         <style>
            {`
               .scrollbar-hide::-webkit-scrollbar {
                  display: none;
               }
               .scrollbar-hide {
                  -ms-overflow-style: none;
                  scrollbar-width: none;
               }
            `}
         </style>
      </>
   )
}

export default Sidebar