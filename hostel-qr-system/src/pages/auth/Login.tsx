import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, LogIn as LogInIcon, AlertCircle } from 'lucide-react';
import { Card, Input, Button } from '@/components/ui';
import { useAuthStore } from '@/store';
import type { UserRole } from '@/types';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login, loading, error, rememberMe, setRememberMe } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [localError, setLocalError] = useState<string | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
      if (from) {
        navigate(from, { replace: true });
      } else {
        const targetPath = user.role === 'student' ? '/student/dashboard' : '/warden/dashboard';
        navigate(targetPath, { replace: true });
      }
    }
  }, [user, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email.trim()) {
      setLocalError('Please enter your email address');
      return;
    }
    if (!password.trim()) {
      setLocalError('Please enter your password');
      return;
    }

    // Execute login via Zustand store
    const loggedInUser = await login(email, password);

    if (loggedInUser) {
      const targetPath = loggedInUser.role === 'student' ? '/student/dashboard' : '/warden/dashboard';
      navigate(targetPath, { replace: true });
    }
  };

  const handleRoleToggle = (role: UserRole) => {
    setSelectedRole(role);
    if (!email) {
      setEmail(role === 'student' ? 'student@hostel.edu' : 'warden@hostel.edu');
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md space-y-6 bg-slate-900/90 border-slate-800 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center mx-auto text-indigo-400">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-100">Welcome Back</h2>
          <p className="text-xs text-slate-400">Sign in to your Hostel QR Portal account</p>
        </div>

        {/* Role Quick Selector */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
          {(['student', 'warden'] as UserRole[]).map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => handleRoleToggle(role)}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg capitalize transition-all ${
                selectedRole === role
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {role} Portal
            </button>
          ))}
        </div>

        {/* Error Message Display */}
        {displayError && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{displayError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            placeholder={selectedRole === 'student' ? 'student@hostel.edu' : 'warden@hostel.edu'}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail className="w-4 h-4" />}
            required
          />

          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="w-4 h-4" />}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-[34px] text-slate-400 hover:text-slate-200 transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
              />
              <span className="text-xs text-slate-400 select-none">Remember session</span>
            </label>

            <a href="#forgot" onClick={(e) => e.preventDefault()} className="text-xs text-indigo-400 hover:underline">
              Forgot password?
            </a>
          </div>

          <Button type="submit" isLoading={loading} className="w-full mt-3">
            <LogInIcon className="w-4 h-4 mr-2" />
            Sign In as {selectedRole === 'student' ? 'Student' : 'Warden'}
          </Button>
        </form>

        <div className="text-center pt-2 border-t border-slate-800/60">
          <p className="text-[11px] text-slate-500">
            Hostel ERP Authentication Layer & Session Persistence
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Login;
