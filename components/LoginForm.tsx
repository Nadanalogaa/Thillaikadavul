
import React, { useState, useEffect } from 'react';
import { loginUser } from '../api';
import type { User } from '../types';
import ModalHeader from './ModalHeader';
import { useTheme } from '../contexts/ThemeContext';

interface LoginFormProps {
  onSuccess: (user: User) => void;
  initialEmail?: string;
  onForgotPassword: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, initialEmail, onForgotPassword }) => {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!email || !password) {
      setError('Please enter both email and password.');
      setIsLoading(false);
      return;
    }

    try {
      const loggedInUser = await loginUser(email, password);
      setIsLoading(false);
      onSuccess(loggedInUser);
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    }
  };

  return (
    <div>
      <ModalHeader title="Welcome Back!" />
      {initialEmail && (
        <p className={`text-center text-sm p-2 rounded-md mb-4 ${
          theme === 'dark'
            ? 'text-yellow-300 bg-yellow-900/30'
            : 'text-yellow-800 bg-yellow-100'
        }`}>
          This email is already registered. Please log in.
        </p>
      )}
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="login-email" className={`block text-sm font-medium ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
          }`}>
            Email Address
          </label>
          <input
            type="email"
            id="login-email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            className={`mt-1 block w-full px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-300 focus:ring-4 focus:ring-indigo-500/30 ${
              theme === 'dark'
                ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-indigo-400'
                : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:bg-white'
            }`}
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="login-password" className={`block text-sm font-medium ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Password
            </label>
            <div className="text-sm">
              <a href="#" onClick={(e) => { e.preventDefault(); onForgotPassword(); }} className={`font-medium transition-colors ${
                theme === 'dark'
                  ? 'text-indigo-400 hover:text-indigo-300'
                  : 'text-indigo-600 hover:text-indigo-800'
              }`}>
                Forgot your password?
              </a>
            </div>
          </div>
          <input
            type="password"
            id="login-password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            className={`mt-1 block w-full px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-300 focus:ring-4 focus:ring-indigo-500/30 ${
              theme === 'dark'
                ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-indigo-400'
                : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:bg-white'
            }`}
          />
        </div>

        {error && <p className={`text-sm text-center ${
          theme === 'dark' ? 'text-red-400' : 'text-red-600'
        }`}>{error}</p>}

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoginForm;
