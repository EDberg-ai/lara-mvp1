import React, { useState, useRef, useEffect } from 'react';
import { LogIn, UserPlus, Eye, EyeOff, AlertCircle, Shield, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { signUp, logIn } from '../../lib/auth';

interface TeacherLoginProps {
  onLoginSuccess: () => void;
  onBack?: () => void;
}

export const TeacherLogin: React.FC<TeacherLoginProps> = ({ onLoginSuccess, onBack }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [touched, setTouched] = useState({ email: false });
  const [showForgotPasswordMessage, setShowForgotPasswordMessage] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const preferredNameRef = useRef<HTMLInputElement>(null);

  // Auto-focus first field on mount and mode change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isSignUp && preferredNameRef.current) {
        preferredNameRef.current.focus();
      } else if (emailRef.current) {
        emailRef.current.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [isSignUp]);

  // Email validation
  const validateEmail = (email: string): string => {
    if (!email) return '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'Please enter a valid email address';
    }
    return '';
  };

  // Handle email blur for validation
  const handleEmailBlur = () => {
    setTouched({ ...touched, email: true });
    setEmailError(validateEmail(email));
  };

  // Map API errors to user-friendly messages
  const getReadableError = (error: string): string => {
    const errorMap: Record<string, string> = {
      'Invalid credentials': 'The email or password you entered is incorrect. Please try again.',
      'Email already exists': 'An account with this email already exists. Try signing in instead.',
      'Network error': 'Unable to connect. Please check your internet connection.',
      'User not found': 'No account found with this email. Would you like to create one?',
      'Invalid email or password': 'The email or password you entered is incorrect. Please try again.',
    };
    return errorMap[error] || error;
  };

  // Password strength calculation
  const getPasswordStrength = (pwd: string): { level: 'weak' | 'medium' | 'strong'; width: string; color: string; srText: string } => {
    if (pwd.length === 0) return { level: 'weak', width: '0%', color: 'bg-slate-200', srText: 'No password entered' };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) return { level: 'weak', width: '33%', color: 'bg-red-500', srText: 'Password strength: weak' };
    if (score <= 3) return { level: 'medium', width: '66%', color: 'bg-amber-500', srText: 'Password strength: medium' };
    return { level: 'strong', width: '100%', color: 'bg-emerald-500', srText: 'Password strength: strong' };
  };

  const passwordStrength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setShowForgotPasswordMessage(false);

    // Validate email before submitting
    const emailValidation = validateEmail(email);
    if (emailValidation) {
      setEmailError(emailValidation);
      setTouched({ ...touched, email: true });
      return;
    }

    setIsLoading(true);

    try {
      const fullName = isSignUp ? `${preferredName.trim()} ${lastName.trim()}`.trim() : '';
      const result = isSignUp
        ? await signUp(email, password, fullName)
        : await logIn(email, password);

      if (result.success) {
        onLoginSuccess();
      } else {
        setError(getReadableError(result.error || 'An error occurred'));
      }
    } catch (err) {
      setError(getReadableError(err instanceof Error ? err.message : 'An error occurred'));
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
    setEmailError('');
    setEmail('');
    setPassword('');
    setPreferredName('');
    setLastName('');
    setTouched({ email: false });
    setShowForgotPasswordMessage(false);
  };

  const handleForgotPassword = () => {
    setShowForgotPasswordMessage(true);
    setError('');
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    },
    exit: { opacity: 0, transition: { duration: 0.15 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* SVG Pattern */}
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            {/* Grid Pattern with L-shaped lines */}
            <pattern id="login-grid-pattern" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
              {/* Vertical line */}
              <line x1="100" y1="0" x2="100" y2="100" stroke="#6bb7e4" strokeWidth="1" opacity="0.3" />
              {/* Horizontal line */}
              <line x1="100" y1="100" x2="200" y2="100" stroke="#6bb7e4" strokeWidth="1" opacity="0.3" />
              {/* L-shaped corner accent */}
              <path d="M 0 50 L 0 0 L 50 0" fill="none" stroke="#6bb7e4" strokeWidth="1" opacity="0.2" />
              <path d="M 150 200 L 200 200 L 200 150" fill="none" stroke="#6bb7e4" strokeWidth="1" opacity="0.2" />
              {/* Decorative circles at intersections */}
              <circle cx="100" cy="100" r="3" fill="#c8ae6a" opacity="0.4" />
              <circle cx="0" cy="0" r="2" fill="#6bb7e4" opacity="0.3" />
              <circle cx="200" cy="200" r="2" fill="#6bb7e4" opacity="0.3" />
            </pattern>
            {/* Radial gradient for fade mask */}
            <radialGradient id="login-fade-mask" cx="50%" cy="50%" r="70%" fx="50%" fy="50%">
              <stop offset="0%" stopColor="white" stopOpacity="0.6" />
              <stop offset="60%" stopColor="white" stopOpacity="0.8" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </radialGradient>
            <mask id="login-vignette-mask">
              <rect width="100%" height="100%" fill="url(#login-fade-mask)" />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="url(#login-grid-pattern)" mask="url(#login-vignette-mask)" />
        </svg>

        {/* Glow Orbs */}
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-gold-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-brand-400/20 rounded-full blur-3xl" />

        {/* Floating Animated Dots */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-brand-400/40 rounded-full animate-float" />
        <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-gold-400/30 rounded-full animate-float-delayed" />
        <div className="absolute bottom-1/4 left-1/3 w-2 h-2 bg-brand-400/30 rounded-full animate-float-slow" />
        <div className="absolute bottom-1/3 right-1/3 w-1.5 h-1.5 bg-gold-400/40 rounded-full animate-float" style={{ animationDelay: '3s' }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Premium Card Container */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          {/* Dark Branded Header */}
          <div className="bg-navy-800 p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-400 via-brand-600 to-navy-800"></div>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="mx-auto mb-4 relative z-10"
            >
              <img src="/iceberg.png" alt="LARA" className="w-20 h-20 mx-auto object-contain" />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-2xl font-logo font-extrabold text-white mb-2 relative z-10"
            >
              LARA
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-brand-100 text-sm font-medium tracking-wide opacity-80 relative z-10"
            >
              {isSignUp ? 'Create your teacher account' : 'Sign in to continue'}
            </motion.p>
          </div>

          {/* Form Container */}
          <div className="p-8">
            <AnimatePresence mode="wait">
              <motion.form
                key={isSignUp ? 'signup' : 'login'}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onSubmit={handleSubmit}
                className="space-y-5"
                aria-label={isSignUp ? 'Sign up form' : 'Login form'}
              >
                {/* Name Fields (Sign Up only) */}
                {isSignUp && (
                  <>
                    <motion.div variants={itemVariants}>
                      <label htmlFor="preferredName" className="block text-sm font-medium text-slate-700 mb-1.5">
                        Preferred Name
                      </label>
                      <input
                        ref={preferredNameRef}
                        type="text"
                        id="preferredName"
                        value={preferredName}
                        onChange={(e) => setPreferredName(e.target.value)}
                        className="w-full px-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 outline-none transition-all"
                        placeholder="e.g., Sarah"
                        required
                        aria-required="true"
                      />
                    </motion.div>
                    <motion.div variants={itemVariants}>
                      <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 mb-1.5">
                        Last Name
                      </label>
                      <input
                        type="text"
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full px-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 outline-none transition-all"
                        placeholder="e.g., Mitchell"
                        required
                        aria-required="true"
                      />
                    </motion.div>
                  </>
                )}

                {/* Email Field */}
                <motion.div variants={itemVariants}>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Work Email
                  </label>
                  <input
                    ref={emailRef}
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (touched.email) {
                        setEmailError(validateEmail(e.target.value));
                      }
                    }}
                    onBlur={handleEmailBlur}
                    className={`w-full px-4 py-3.5 bg-slate-50/50 border rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 outline-none transition-all ${
                      emailError && touched.email ? 'border-red-300 bg-red-50/30' : 'border-slate-200'
                    }`}
                    placeholder="you@school.edu"
                    required
                    aria-required="true"
                    aria-invalid={!!(emailError && touched.email)}
                    aria-describedby={emailError && touched.email ? 'email-error' : undefined}
                  />
                  {emailError && touched.email && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      id="email-error"
                      className="mt-1.5 text-sm text-red-600 flex items-center gap-1.5"
                      role="alert"
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      {emailError}
                    </motion.p>
                  )}
                </motion.div>

                {/* Password Field */}
                <motion.div variants={itemVariants}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                      Password
                    </label>
                    {!isSignUp && (
                      <button
                        type="button"
                        className="text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors"
                        onClick={handleForgotPassword}
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3.5 pr-12 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 outline-none transition-all"
                      placeholder={isSignUp ? 'At least 6 characters' : 'Enter your password'}
                      required
                      aria-required="true"
                      minLength={isSignUp ? 6 : undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-100"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  {/* Password Strength Indicator (Sign Up only) */}
                  {isSignUp && password.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2.5"
                    >
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: passwordStrength.width }}
                          className={`h-full ${passwordStrength.color}`}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      <p className={`text-xs mt-1.5 ${
                        passwordStrength.level === 'weak' ? 'text-red-600' :
                        passwordStrength.level === 'medium' ? 'text-amber-600' : 'text-emerald-600'
                      }`}>
                        <span className="sr-only">{passwordStrength.srText}</span>
                        <span aria-hidden="true">
                          Password strength: {passwordStrength.level}
                          {passwordStrength.level === 'weak' && ' — try adding numbers and uppercase letters'}
                        </span>
                      </p>
                    </motion.div>
                  )}
                </motion.div>

                {/* Forgot Password Message */}
                {showForgotPasswordMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700"
                    role="status"
                    aria-live="polite"
                  >
                    <p className="font-medium mb-1">Password Reset</p>
                    <p className="text-blue-600">
                      Please contact your school administrator or email{' '}
                      <span className="font-medium">support@edberg-edu.com</span> for assistance.
                    </p>
                  </motion.div>
                )}

                {/* Error Display */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3"
                    role="alert"
                    aria-live="polite"
                  >
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </motion.div>
                )}

                {/* Submit Button */}
                <motion.button
                  variants={itemVariants}
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-medium py-3.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-500/30 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-500/40 focus:ring-2 focus:ring-brand-500/50 focus:ring-offset-2 outline-none"
                >
                  {isLoading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                      <span>Please wait...</span>
                    </>
                  ) : (
                    <>
                      {isSignUp ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                      <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                    </>
                  )}
                </motion.button>
              </motion.form>
            </AnimatePresence>

            {/* Toggle between Login/Signup */}
            <div className="mt-6 text-center">
              <button
                onClick={toggleMode}
                className="text-brand-600 hover:text-brand-700 text-sm font-medium transition-colors focus:outline-none focus:underline"
              >
                {isSignUp
                  ? 'Already have an account? Sign in'
                  : "Don't have an account? Sign up"}
              </button>
            </div>

            {/* Trust Indicator */}
            <div className="mt-6 flex items-center justify-center gap-2 text-slate-400">
              <Shield className="w-4 h-4" />
              <span className="text-xs">Secure, encrypted connection</span>
            </div>

            {/* Back Link */}
            {onBack && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                <button
                  onClick={onBack}
                  className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-slate-700 text-sm font-medium py-2 transition-colors focus:outline-none focus:underline"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to landing page
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
              LARA v2.1 | EDberg Education
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
