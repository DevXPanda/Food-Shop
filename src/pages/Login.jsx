import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      // Use Supabase Auth for both admin and regular users
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data?.user) {
        // Check if user exists in the admins table
        const { data: adminData, error: adminError } = await supabase
          .from('admins')
          .select('*')
          .eq('id', data.user.id)
          .single();

        // If user is in admins table, they are an admin
        if (!adminError && adminData) {
          // Check if admin is approved
          if (adminData.is_approved) {
            // Admin is approved
            toast.success('Admin login successful!');
            navigate('/admin-dashboard');
          } else {
            // Admin is not approved yet
            toast.error('Your admin account is pending approval. Please contact the super admin.');
            // Sign out the user since they're not approved yet
            await supabase.auth.signOut();
          }
        } else {
          // User is not an admin, check if they have a profile
          const { data: profileData, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          // If profile doesn't exist, create one
          if (profileError && profileError.code === 'PGRST116') {
            const { error: insertError } = await supabase
              .from('user_profiles')
              .insert([
                {
                  id: data.user.id,
                  first_name: '',
                  last_name: '',
                  created_at: new Date()
                }
              ]);

            if (insertError) {
              console.error('Error creating user profile:', insertError);
            }
          }

          toast.success('Login successful!');
          navigate('/');
        }
      }
    } catch (error) {
      console.error('Error logging in:', error);
      toast.error(error.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider) => {
    setLoading(true);
    try {
      // Store preference in localStorage so we can check after OAuth callback
      localStorage.setItem('loginAsAdmin', showAdminLogin || isAdmin ? 'true' : 'false');
      
      // Redirect URL to help handle the OAuth callback
      const redirectTo = `${window.location.origin}/oauth-callback`;
      
      const { error } = await supabase.auth.signInWithOAuth({ 
        provider,
        options: {
          redirectTo,
          queryParams: {
            // Pass admin preference as a query parameter
            admin: (showAdminLogin || isAdmin) ? 'true' : 'false'
          }
        }
      });
      
      if (error) throw error;
      // The user will be redirected to the provider's login page
    } catch (error) {
      toast.error(error.message || 'OAuth login failed');
      setLoading(false); // Reset loading state on error
    }
    // Don't set loading to false in finally block as the redirect will happen
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-2xl border border-orange-100">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 font-display tracking-tight">
            {showAdminLogin ? "Admin Login" : "Welcome Back!"}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link to="/signup" className="font-medium text-orange-600 hover:text-orange-500 transition-colors">
              create a new account
            </Link>
          </p>
          <div className="flex justify-center mt-4">
            <button
              type="button"
              onClick={() => setShowAdminLogin(!showAdminLogin)}
              className="text-xs text-orange-700 underline hover:text-orange-900"
            >
              {showAdminLogin ? "User Login" : "Admin Login"}
            </button>
          </div>
          {/* OAuth Buttons */}
          {/* <div className="flex flex-col gap-3 mt-6">
            <button
              type="button"
              onClick={() => handleOAuthLogin('google')}
              className="w-full py-2 px-4 rounded-lg bg-white border border-gray-300 text-gray-700 font-semibold flex items-center justify-center gap-2 shadow hover:bg-gray-50 transition"
              disabled={loading}
            >
              <img src="https://img.icons8.com/color/24/000000/google-logo.png" alt="Google" />
              Continue with Google
            </button>
            <button
              type="button"
              onClick={() => handleOAuthLogin('facebook')}
              className="w-full py-2 px-4 rounded-lg bg-white border border-gray-300 text-gray-700 font-semibold flex items-center justify-center gap-2 shadow hover:bg-gray-50 transition"
              disabled={loading}
            >
              <img src="https://img.icons8.com/color/24/000000/facebook-new.png" alt="Facebook" />
              Continue with Facebook
            </button>
          </div> */}
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="email-address" className="sr-only">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 sm:text-sm transition"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 sm:text-sm transition"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                Remember me
              </label>
            </div>
            <div className="text-sm">
              <a href="#" className="font-medium text-orange-600 hover:text-orange-500 transition-colors">
                Forgot your password?
              </a>
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="is-admin"
              name="is-admin"
              type="checkbox"
              checked={isAdmin}
              onChange={() => setIsAdmin(!isAdmin)}
              className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
            />
            <label htmlFor="is-admin" className="ml-2 block text-sm text-gray-900">
              Login as Admin
            </label>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-lg shadow transition disabled:opacity-60"
          >
            {loading ? (showAdminLogin ? "Signing in as Admin..." : "Signing in...") : (showAdminLogin ? "Admin Sign in" : "Sign in")}
          </button>
        </form>
      {/* Add OAuth buttons below the form */}
      <div className="mt-6 flex flex-col gap-3">
        <button
          type="button"
          onClick={() => handleOAuthLogin('google')}
          className="w-full py-3 px-4 rounded-xl bg-white border border-gray-300 text-gray-700 font-semibold flex items-center justify-center gap-2 shadow hover:bg-gray-50"
          disabled={loading}
        >
          <img src="https://img.icons8.com/color/24/000000/google-logo.png" alt="Google" />
          Continue with Google
        </button>
        {/* <button
          type="button"
          onClick={() => handleOAuthLogin('facebook')}
          className="w-full py-3 px-4 rounded-xl bg-blue-600 text-white font-semibold flex items-center justify-center gap-2 shadow hover:bg-blue-700"
          disabled={loading}
        >
          <img src="https://img.icons8.com/color/24/000000/facebook-new.png" alt="Facebook" />
          Continue with Facebook
        </button> */}
      </div>
    </div>
  </div>
);
};
export default Login;
