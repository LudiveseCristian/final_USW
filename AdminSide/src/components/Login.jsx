"use client"
import { useState } from "react"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "../firebase/config"
import { ShoppingBag, Eye, EyeOff, Mail, Lock } from "lucide-react"
import bg_Login from "../assets/images/login/background_login.png"
import logoCircle from "../assets/images/login/USWLogo.png"

const Login = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      await signInWithEmailAndPassword(auth, email, password)
      // Login successful - user will be redirected by auth state change
    } catch (error) {
      console.error("Login error:", error)
      
      // Provide more specific error messages
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setError("Invalid email or password. Please check your credentials.")
          break
        case 'auth/too-many-requests':
          setError("Too many failed attempts. Please try again later.")
          break
        case 'auth/user-disabled':
          setError("This account has been disabled. Please contact support.")
          break
        default:
          setError("Login failed. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#FFFCF3" }}>
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 z-10" style={{ backgroundColor: "rgba(63, 62, 62, 0.61)" }}></div>
        <img
          src={bg_Login}
          alt="Upcycled Streetwear Collection"
          className="w-full h-full object-cover"
        />

       {/* Centered circular logo */}
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <img
            src={logoCircle}
            alt="Upcycled Streetwear Logo"
            className="w-[350px] h-[350px] rounded-full border-4 border-white shadow-lg object-cover"
          />
        </div>
        
      </div>

      <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <div className="lg:hidden flex justify-center mb-6">
              <div className="p-4 rounded-2xl" style={{ backgroundColor: "#135918" }}>
                <ShoppingBag className="h-10 w-10 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-[#135918] mb-3">Upcycled Streetwear</h1>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome Back</h2>
            <p className="text-slate-600 text-lg">Sign in to your admin dashboard</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-3 flex-shrink-0"></div>
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-3">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-600 focus:border-transparent transition-all duration-200 text-slate-900 placeholder-slate-500 bg-slate-50 focus:bg-white"
                      placeholder="Enter your email address"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-3">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-12 py-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-600 focus:border-transparent transition-all duration-200 text-slate-900 placeholder-slate-500 bg-slate-50 focus:bg-white"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors duration-200"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none disabled:hover:shadow-lg disabled:opacity-50"
                style={{
                  backgroundColor: loading ? "#9ca3af" : "#135918",
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = "#0f4a16"
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = "#135918"
                  }
                }}
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                ) : (
                  "Sign In to Dashboard"
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-200">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm font-medium text-slate-700 mb-2">Demo Credentials:</p>
                <div className="space-y-1 text-sm text-slate-600">
                  <p>
                    <span className="font-medium">Email:</span> admin@upcycled.com
                  </p>
                  <p>
                    <span className="font-medium">Password:</span> admin123
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-8">
            <p className="text-sm text-slate-500">
              © 2024 Upcycled Streetwear. Sustainable fashion for the modern world.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
