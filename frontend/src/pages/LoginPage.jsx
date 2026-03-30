import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(
        err.response?.data?.message || 
        (err.code === 'ERR_NETWORK' ? 'Cannot connect to server. Ensure backend is running.' : 'Login failed. Please try again.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-bg flex items-center justify-center font-sans p-6">
      {/* Subtle Background Pattern or Accent */}
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#D2B48C_1px,transparent_1px)] [background-size:24px_24px]" />
      
      <div className="relative z-10 w-full max-w-5xl flex bg-white/50 backdrop-blur-xl rounded-[32px] shadow-2xl overflow-hidden border border-brown-light/20">
        {/* Left Side: Branding / Info */}
        <div className="hidden lg:flex w-1/2 bg-brown-dark p-16 flex-col justify-between text-white relative">
          <div className="absolute inset-0 bg-gradient-to-br from-brown-dark to-[#332211] opacity-90" />
          
          <div className="relative z-10">
            <h2 className="font-display text-5xl font-extrabold tracking-tight mb-4">Quill</h2>
            <p className="text-secondary font-medium tracking-widest uppercase text-sm">Real-time collaboration</p>
          </div>

          <div className="relative z-10">
            <blockquote className="text-3xl font-medium leading-tight mb-6 opacity-90">
              "The most powerful tool for creative minds to synchronize."
            </blockquote>
            <div className="flex items-center gap-4">
              <div className="h-1 w-12 bg-secondary rounded-full" />
              <p className="text-lg opacity-80">Workspace evolved.</p>
            </div>
          </div>

          <div className="relative z-10 text-sm opacity-60">
            &copy; 2026 Quill Editor. All rights reserved.
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="flex-1 p-12 lg:p-20 flex flex-col justify-center bg-white/80">
          <div className="max-w-md w-full mx-auto">
            <div className="mb-12">
              <h1 className="text-4xl font-extrabold text-charcoal mb-4">Welcome back</h1>
              <p className="text-brown-dark/60 font-semibold uppercase tracking-widest text-xs">Login to your account</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 rounded-2xl p-4 mb-8 text-sm animate-fade-in font-medium flex items-center gap-3">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-charcoal text-sm font-bold mb-2 tracking-wide">Email Address</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="name@company.com"
                  className="w-full px-5 py-4 bg-beige-soft/30 border border-brown-light/30 rounded-2xl text-charcoal placeholder-charcoal/30 focus:outline-none focus:border-brown-dark focus:ring-4 focus:ring-brown-light/10 transition-all font-medium"
                />
              </div>
              <div>
                <label className="block text-charcoal text-sm font-bold mb-2 tracking-wide">Password</label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full px-5 py-4 bg-beige-soft/30 border border-brown-light/30 rounded-2xl text-charcoal placeholder-charcoal/30 focus:outline-none focus:border-brown-dark focus:ring-4 focus:ring-brown-light/10 transition-all font-medium"
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 mt-4 bg-brown-dark text-white font-black tracking-[0.1em] uppercase text-[11px] rounded-2xl shadow-[0_10px_25px_rgba(92,64,51,0.2)] hover:shadow-[0_15px_35px_rgba(92,64,51,0.3)] hover:bg-[#4A3525] transform transition-all hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:transform-none"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </span>
                ) : 'Sign In'}
              </button>
            </form>

            <div className="mt-12 text-center text-charcoal/60 font-semibold text-sm">
              New here?{' '}
              <Link to="/signup" className="text-brown-dark hover:underline underline-offset-4 decoration-2 transition-all">
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
