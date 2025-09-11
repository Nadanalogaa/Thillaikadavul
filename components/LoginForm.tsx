
import React, { useState, useEffect } from 'react';
import { loginUser } from '../api';
import type { User } from '../types';
import ModalHeader from './ModalHeader';

interface LoginFormProps {
  onSuccess: (user: User) => void;
  initialEmail?: string;
  onForgotPassword: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, initialEmail, onForgotPassword }) => {
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
      <div className="nad-modal__header mb-6">
        <ModalHeader title="Welcome Back!" subtitle="Log in to continue to your dashboard" />
      </div>
      {initialEmail && (
        <p className="text-center text-sm text-yellow-800 bg-yellow-100 p-2 rounded-md mb-4">
          This email is already registered. Please log in.
        </p>
      )}
      <form className="nad-form space-y-5" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="login-email" className="block text-sm font-medium">
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
            placeholder="you@example.com"
            className="mt-2 block w-full nad-input"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="login-password" className="block text-sm font-medium">
              Password
            </label>
            <div className="text-sm">
              <a href="#" onClick={(e) => { e.preventDefault(); onForgotPassword(); }} className="font-medium text-accent hover:opacity-90">
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
            placeholder="••••••••"
            className="mt-2 block w-full nad-input"
          />
        </div>

        {error && <p className="text-sm text-red-600 text-center">{error}</p>}

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="nad-btn-primary w-full"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoginForm;
