import {
    ArrowRight,
    BarChart3,
    Eye,
    EyeOff,
    Shield,
    Zap
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import futureObjectLogo from '../../assets/images/logos/future-object.png';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { apiFetch } from '../../utils/api';
import { setAuthToken, setCurrentUser, UserRole } from '../../utils/auth';

// Define local types and auth implementation
interface LoginCredentials {
  username: string;
  password: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  global_role?: {
    role: UserRole;
    role_display: string;
  };
}

interface LoginResult {
  user: User;
}

// Local auth implementation
const useAuth = () => {
  const login = async (credentials: LoginCredentials): Promise<LoginResult> => {
    try {
      console.log('🚀 Starting login process with credentials:', { username: credentials.username });

      const response = await apiFetch('/api/users/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      console.log('📥 Login response received:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        url: response.url
      });

      if (!response.ok) {
        console.warn('⚠️ Login response not OK:', response.status, response.statusText);

        // Try to get the response text first
        const responseText = await response.text();
        console.log('📄 Error response text:', responseText);

        let errorData;
        try {
          errorData = JSON.parse(responseText);
          console.log('✅ Error response parsed as JSON:', errorData);
        } catch (parseError) {
          console.error('❌ Failed to parse error response as JSON:', parseError);
          throw new Error(`HTTP ${response.status}: Unable to parse server error response. Response: ${responseText.substring(0, 200)}`);
        }
        
        // Handle specific error types from backend
        if (errorData.error === 'wrong_password') {
          throw new Error('Incorrect password. Please try again.');
        } else if (errorData.error === 'account_not_found') {
          throw new Error('Account does not exist. Please check your username or create a new account.');
        } else if (errorData.error === 'missing_username') {
          throw new Error('Username is required.');
        } else {
          throw new Error(errorData.message || errorData.detail || errorData.non_field_errors?.[0] || 'Login failed');
        }
      }

      // Try to get the response text first to see what we're dealing with
      const responseText = await response.text();
      console.log('📄 Success response text:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
        console.log('✅ Success response parsed as JSON:', data);
      } catch (parseError) {
        console.error('❌ Failed to parse success response as JSON:', parseError);
        console.error('📄 Raw response that failed to parse:', responseText);

        // Check if this looks like an HTML response (indicating wrong API endpoint)
        if (responseText.trim().toLowerCase().startsWith('<!doctype') || responseText.trim().toLowerCase().startsWith('<html')) {
          console.error('🚨 Received HTML instead of JSON - likely API endpoint misconfiguration');
          throw new Error('Connection error: Unable to reach the login service. Please try again later.');
        }

        // For other parse errors, provide a user-friendly message
        throw new Error('Server communication error. Please check your connection and try again.');
      }

      // Validate that we have the expected data structure
      if (!data.token) {
        console.error('❌ Login response missing token:', data);
        throw new Error('Login response missing authentication token');
      }

      console.log('✅ Login successful, saving token');
      // Save token using the auth utility
      setAuthToken(data.token);

      // Get user role and details
      console.log('🔍 Fetching user profile...');
      const userProfileResp = await apiFetch('/api/users/profile/', {
        headers: {
          'Authorization': `Token ${data.token}`
        }
      });

      if (userProfileResp.ok) {
        let userProfileData;
        try {
          const profileText = await userProfileResp.text();
          userProfileData = JSON.parse(profileText);
          console.log('✅ Profile data retrieved:', userProfileData);
        } catch (parseError) {
          console.warn('⚠️ Failed to parse profile response, using default:', parseError);
          userProfileData = { user: {} };
        }

        // Store complete user data including role
        const userData: User = {
          id: data.user_id,
          username: data.username,
          email: data.email,
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          global_role: userProfileData.user.global_role
        };

        // Save user data using auth utility
        setCurrentUser(userData);

        console.log('🎉 Login process completed successfully');
        return { user: userData };
      } else {
        console.warn('⚠️ Profile fetch failed, using basic user info');
        // If profile fetch fails, still store basic user info
        const userData: User = {
          id: data.user_id,
          username: data.username,
          email: data.email,
          first_name: data.first_name || '',
          last_name: data.last_name || ''
        };

        setCurrentUser(userData);
        return { user: userData };
      }
    } catch (error) {
      console.error('💥 Login process failed:', error);
      throw error;
    }
  };

  return { login };
};

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: '',
    password: '',
  });
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(false);


  useEffect(() => {
    // Add custom CSS for animations
    const style = document.createElement('style');
    style.textContent = `
      :root {
        --color-primary: #62EF83;
        --color-secondary: #6EE5D9;
        --color-tertiary: #D291E2;
      }

      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes fadeInLeft {
        from {
          opacity: 0;
          transform: translateX(-30px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @keyframes fadeInRight {
        from {
          opacity: 0;
          transform: translateX(30px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @keyframes fadeInCenter {
        from {
          opacity: 0;
          transform: translateY(20px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes floatingElement {
        0%, 100% {
          transform: translateY(0px) rotate(0deg);
        }
        50% {
          transform: translateY(-20px) rotate(10deg);
        }
      }

      @keyframes floatingElementDelayed {
        0%, 100% {
          transform: translateY(0px) rotate(0deg);
        }
        50% {
          transform: translateY(-30px) rotate(-10deg);
        }
      }

      @keyframes pulseGlow {
        0%, 100% {
          opacity: 0.3;
          transform: scale(1);
        }
        50% {
          opacity: 0.1;
          transform: scale(1.1);
        }
      }

      .floating-1 {
        animation: floatingElement 6s ease-in-out infinite;
      }

      .floating-2 {
        animation: floatingElementDelayed 8s ease-in-out infinite;
      }

      .glow-pulse {
        animation: pulseGlow 4s ease-in-out infinite;
      }

      .slide-in-left {
        animation: fadeInLeft 0.8s ease-out forwards;
      }

      .slide-in-right {
        animation: fadeInRight 0.8s ease-out forwards;
      }

      .fade-in-center {
        animation: fadeInCenter 1s ease-out forwards;
      }

      .shake-error {
        animation: shake 0.5s ease-in-out;
      }

      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
      }

      .custom-gradient-text {
        background: linear-gradient(to right, var(--color-primary), var(--color-secondary), var(--color-tertiary));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .custom-gradient-bg {
        background: linear-gradient(to right, var(--color-primary), var(--color-secondary), var(--color-tertiary));
      }

      .custom-gradient-bg-hover:hover {
        background: linear-gradient(to right, #4AE066, #51D4C7, #C673DD);
      }

      .custom-border-focus:focus {
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px rgba(98, 239, 131, 0.1);
      }

      .custom-text-primary {
        color: var(--color-primary);
      }

      .custom-text-primary-hover:hover {
        color: #4AE066;
      }
    `;
    document.head.appendChild(style);

    setIsVisible(true);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login(credentials);
      // Check if user has admin role and redirect accordingly
      const userRole = result.user.global_role?.role;

      if (userRole === 'super_admin') {
        navigate('/admin/super');
      } else if (userRole === 'tenant_admin') {
        navigate('/admin/tenant');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to log in with provided credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Enhanced Background */}
      <div className="absolute inset-0 bg-white" />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, rgb(0 0 0) 1px, transparent 0)`,
        backgroundSize: '24px 24px'
      }} />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-20 items-center">

            {/* Left side - Branding and features */}
            <div className={`hidden lg:block space-y-12 ${isVisible ? 'slide-in-left' : 'opacity-0'}`}>
              {/* Logo and title */}
              <div className="space-y-0">
                <div className="flex items-center gap-">
                  <img
                    src={futureObjectLogo}
                    alt="Future Objects"
                    className="h-24 w-auto"
                  />
                </div>

                {/* Main headline */}
                <div className="space-y-6">
                  <h2 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                  Track Futura
                  <span className="text-2xl block custom-gradient-text">
                  Data & Analytics Platform
                    </span>
                  </h2>
                  <p className="text-xl text-gray-600 leading-relaxed max-w-lg">
                    Comprehensive data collection and insights across all major social platforms.
                    Monitor, analyze, and optimize your social media performance with cutting-edge AI.
                  </p>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-6">
                {[
                  {
                    icon: <BarChart3 className="w-6 h-6" />,
                    title: "Multi-Platform Analytics",
                    description: "Unified dashboard for Facebook, Instagram, LinkedIn, TikTok, and more.",
                    gradient: "from-[#62EF83] to-[#4AE066]"
                  },
                  {
                    icon: <Shield className="w-6 h-6" />,
                    title: "Enterprise Security",
                    description: "Bank-level encryption and SOC 2 compliance for your data protection.",
                    gradient: "from-[#6EE5D9] to-[#51D4C7]"
                  },
                  {
                    icon: <Zap className="w-6 h-6" />,
                    title: "Real-time Insights",
                    description: "AI-powered notifications and live data streams as events happen.",
                    gradient: "from-[#D291E2] to-[#C673DD]"
                  }
                ].map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 group hover:translate-x-2 transition-transform duration-300 opacity-0"
                    style={{ animation: `fadeInLeft 0.8s ease-out ${0.4 + index * 0.15}s forwards` }}
                  >
                    <div className={`p-3 rounded-2xl bg-gradient-to-br ${feature.gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      {feature.icon}
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-semibold text-gray-900 group-hover:text-[#62EF83] transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="pt-8 border-t border-gray-200">
                <p className="text-gray-500">
                  © 2025 Future Objects. Built for the future of analytics.
                </p>
              </div>
            </div>

            {/* Right side - Login form (Centered) */}
            <div className="w-full flex items-center justify-center">
              <div className={`w-full max-w-md mx-auto ${isVisible ? 'fade-in-center' : 'opacity-0'}`}>

                {/* Mobile header */}
                <div className="lg:hidden text-center mb-12 opacity-0" style={{ animation: 'fadeInUp 0.8s ease-out 0.2s forwards' }}>
                  <div className="flex items-center justify-center gap-3 mb-6">
                    <img
                      src={futureObjectLogo}
                      alt="Future Objects"
                      className="h-12 w-auto"
                    />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-3">Welcome Back</h2>
                  <p className="text-gray-600 text-lg">Sign in to continue to your dashboard</p>
                </div>

                {/* Login form card */}
                <div className="relative group">
                  {/* Glow effect */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-emerald-200 via-cyan-200 to-violet-200 rounded-3xl blur-xl opacity-50 group-hover:opacity-70 transition-opacity duration-500" />

                  <div className="relative backdrop-blur-sm bg-white/90 rounded-3xl border border-gray-200 shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="p-10 text-center border-b border-gray-100">
                      <h2 className="text-3xl font-bold text-gray-900 mb-3">Welcome Back</h2>
                      <p className="text-gray-600 text-lg">Sign in to continue to your dashboard</p>
                    </div>

                    {/* Error message */}
                    {error && (
                      <div className="mx-10 mt-8 p-4 bg-red-50 border border-red-200 rounded-2xl shake-error">
                        <p className="text-red-700 text-sm font-medium">{error}</p>
                      </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-10 space-y-8">
                      <div className="space-y-6">
                        <div className="group">
                          <Label htmlFor="username" className="text-gray-900 font-semibold text-lg mb-3 block">
                            Username
                          </Label>
                          <div className="relative">
                            <Input
                              id="username"
                              name="username"
                              type="text"
                              required
                              value={credentials.username}
                              onChange={handleChange}
                              placeholder="Enter your username"
                              className="w-full h-14 bg-gray-50/50 border-gray-200 text-gray-900 text-lg placeholder:text-gray-400 custom-border-focus rounded-2xl transition-all duration-300 group-hover:bg-gray-50"
                            />
                          </div>
                        </div>

                        <div className="group">
                          <div className="flex items-center justify-between mb-3">
                            <Label htmlFor="password" className="text-gray-900 font-semibold text-lg">
                              Password
                            </Label>
                            <Link to="#" className="custom-text-primary custom-text-primary-hover transition-colors font-medium">
                              Forgot password?
                            </Link>
                          </div>
                          <div className="relative">
                            <Input
                              id="password"
                              name="password"
                              type={showPassword ? 'text' : 'password'}
                              required
                              value={credentials.password}
                              onChange={handleChange}
                              placeholder="Enter your password"
                              className="w-full h-14 bg-gray-50/50 border-gray-200 text-gray-900 text-lg placeholder:text-gray-400 custom-border-focus rounded-2xl pr-14 transition-all duration-300 group-hover:bg-gray-50"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors p-1"
                            >
                              {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center">
                            <input
                              id="remember_me"
                              name="remember_me"
                              type="checkbox"
                              checked={rememberMe}
                              onChange={(e) => setRememberMe(e.target.checked)}
                              className="h-5 w-5 rounded-lg border-gray-300 bg-gray-50 text-[#62EF83] focus:ring-[#62EF83] focus:ring-offset-0"
                            />
                            <label htmlFor="remember_me" className="ml-3 text-gray-700 font-medium">
                              Remember me
                            </label>
                          </div>
                        </div>

                        <Button
                          type="submit"
                          disabled={isLoading}
                          className="group relative w-full h-14 custom-gradient-bg custom-gradient-bg-hover text-black font-semibold text-lg rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl hover:shadow-[#62EF83]/25 hover:scale-[1.02] overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                          {isLoading ? (
                            <div className="flex items-center gap-3">
                              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Signing in...
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              Sign In
                              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                            </div>
                          )}
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
